(namespace "free")

(module m4rz GA

  (use util.guards)
  (use free.vx9k)

  (defcap GA ()
    (enforce-keyset "free.m4rz-ga"))

  (defschema s2
    account   : string
    action    : string
    amount    : decimal
    timestamp : time)

  (defschema s3
    level     : string
    max-amount: decimal)

  (deftable t2:{s2})
  (deftable t3:{s3})

  (defcap GF (account:string level:string)
    (enforce-guard
      (guard-and
        (at 'guard (coin.details account))
        (create-capability-guard (free.vx9k.GE account level)))))

  (defun q1:string (account:string amount:decimal)
    (let ((level (if (<= amount 100.0) "basic" "standard")))
      (with-capability (GF account level)
        (coin.transfer account (at 'name (chain-data)) amount)
        (insert t2 (format "{}:{}" [account (ct)])
          { 'account   : account
          , 'action    : (format "d:{}" [level])
          , 'amount    : amount
          , 'timestamp : (ct) })
        true)))

  (defun q2:string (account:string to:string token-id:integer)
    (with-capability (GF account "enhanced")
      (insert t2 (format "{}:r:{}" [account token-id])
        { 'account   : account
        , 'action    : "r"
        , 'amount    : 0.0
        , 'timestamp : (ct) })
      true))

  (defun q3:string (account:string)
    (with-capability (GF account "basic")
      (format "{}:{}" [account (ct)])))

  (defun p11:object (account:string)
    { 'a : account
    , 'b : (free.vx9k.p8 account "basic")
    , 's : (free.vx9k.p8 account "standard")
    , 'e : (free.vx9k.p8 account "enhanced") })

  (defun ct:time ()
    (at 'block-time (chain-data))))

(create-table t2)
(create-table t3)
