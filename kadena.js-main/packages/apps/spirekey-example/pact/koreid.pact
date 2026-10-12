(namespace "free")

(module vx9k GA

  (use util.guards)

  (defcap GA ()
    (enforce-keyset "free.vx9k-ga"))

  (defschema s0
    account      : string
    level        : string
    oracle-key   : string
    proof-hash   : string
    active       : bool
    issued-at    : time
    expires-at   : time)

  (defschema s1
    name         : string
    active       : bool
    registered-at: time)

  (deftable t0:{s0})
  (deftable t1:{s1})

  (defconst LV ["basic" "standard" "enhanced"])
  (defconst MX 365.0)

  (defcap GB (account:string level:string)
    (enforce-keyset "free.vx9k-gb")
    (enforce (contains level LV) (format "e1:{}" [level])))

  (defcap GC (account:string)
    (enforce-guard (at 'guard (coin.details account))))

  (defcap GD (account:string level:string)
    (enforce-keyset "free.vx9k-gb"))

  (defcap GE (account:string level:string)
    (with-read t0 (rk account level)
      { 'active    := a
      , 'expires-at := e }
      (enforce a  (format "e2:{}" [level]))
      (enforce (> e (ct)) (format "e3:{}" [level]))))

  (defun rk:string (account:string level:string)
    (format "{}:{}" [account level]))

  (defun ct:time ()
    (at 'block-time (chain-data)))

  (defun dy:decimal (n:decimal)
    (* n 86400.0))

  (defun p4 (i:string n:string)
    (with-capability (GA)
      (insert t1 i
        { 'name          : n
        , 'active        : true
        , 'registered-at : (ct) })))

  (defun p5 (i:string)
    (with-capability (GA)
      (update t1 i { 'active : false })))

  (defun p6:object{s1} (i:string)
    (read t1 i))

  (defun p1
    ( account   : string
      level     : string
      proof-hash: string
      expiry-days:decimal)
    (with-capability (GB account level)
      (enforce (> expiry-days 0.0)  "e4")
      (enforce (<= expiry-days MX)  "e5")
      (enforce (!= proof-hash "")   "e6")
      (let* (
        (now    (ct))
        (expiry (add-time now (dy expiry-days)))
        (sender (at 'sender (chain-data)))
        (key    (rk account level)))
        (write t0 key
          { 'account    : account
          , 'level      : level
          , 'oracle-key : sender
          , 'proof-hash : proof-hash
          , 'active     : false
          , 'issued-at  : now
          , 'expires-at : expiry })
        true)))

  (defun p2 (account:string level:string)
    (with-capability (GC account)
      (let ((key (rk account level)))
        (with-read t0 key
          { 'active := a, 'expires-at := e }
          (enforce (not a) "e7")
          (enforce (> e (ct)) "e8")
          (update t0 key { 'active : true })
          true))))

  (defun p3 (account:string level:string)
    (with-capability (GD account level)
      (update t0 (rk account level) { 'active : false })
      true))

  (defun p9:guard (account:string level:string)
    (create-capability-guard (GE account level)))

  (defun p10:guard (account:string level:string)
    (guard-and
      (at 'guard (coin.details account))
      (create-capability-guard (GE account level))))

  (defun p7:object{s0} (account:string level:string)
    (read t0 (rk account level)))

  (defun p8:bool (account:string level:string)
    (try false
      (with-read t0 (rk account level)
        { 'active := a, 'expires-at := e }
        (and a (> e (ct))))))

  ;; p12 — oracle renews expiry (pushes expires-at forward, resets active to false)
  ;; user must call p2 again to re-accept with fresh biometric
  (defun p12 (account:string level:string proof-hash:string expiry-days:decimal)
    (with-capability (GB account level)
      (enforce (> expiry-days 0.0) "e4")
      (enforce (<= expiry-days MX) "e5")
      (let* (
        (now    (ct))
        (expiry (add-time now (dy expiry-days)))
        (sender (at 'sender (chain-data)))
        (key    (rk account level)))
        (update t0 key
          { 'oracle-key : sender
          , 'proof-hash : proof-hash
          , 'active     : false
          , 'issued-at  : now
          , 'expires-at : expiry })
        true)))

  ;; p13 — seconds remaining until expiry (negative = already expired)
  (defun p13:decimal (account:string level:string)
    (try -1.0
      (with-read t0 (rk account level) { 'expires-at := e }
        (diff-time e (ct)))))

  ;; p14 — expiry status object for UI
  ;;   status: "active" | "expiring-soon" | "expired" | "not-found"
  ;;   seconds-left: decimal
  ;;   needs-renewal: bool  (< 30 days or expired)
  (defun p14:object (account:string level:string)
    (try
      { 'status        : "not-found"
      , 'seconds-left  : -1.0
      , 'needs-renewal : true }
      (with-read t0 (rk account level)
        { 'active := a, 'expires-at := e }
        (let* (
          (secs-left  (diff-time e (ct)))
          (expired    (<= secs-left 0.0))
          (soon       (and (not expired) (< secs-left 2592000.0)))  ;; < 30 days
          (status     (if expired "expired" (if soon "expiring-soon" "active"))))
          { 'status        : status
          , 'seconds-left  : secs-left
          , 'needs-renewal : (or expired soon) }))))
)

(create-table t0)
(create-table t1)
