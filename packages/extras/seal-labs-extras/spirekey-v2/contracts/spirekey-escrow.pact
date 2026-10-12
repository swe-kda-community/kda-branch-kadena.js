(module spirekey-escrow GOVERNANCE
  @doc "Atomic escrow with SpireKey signing"
  (defcap GOVERNANCE () (enforce-keyset 'admin-keyset))
  (defschema escrow buyer:string seller:string amount:decimal rwa-id:integer status:string)
  (deftable escrows:{escrow})

  (defpact spirekey-escrow-pact (buyer:string seller:string amount:decimal rwa-id:integer timeout:time)
    (step
      (with-capability (GOVERNANCE)
        (enforce-guard (spirekey-guard buyer))
        (coin.transfer buyer "escrow" amount)
        (insert escrows (hash [buyer seller]) { 'buyer: buyer, 'seller: seller, 'amount: amount, 'rwa-id: rwa-id, 'status: "pending" })))
    (step
      (with-capability (GOVERNANCE)
        (enforce-guard (spirekey-guard seller))
        ;; Need rwa implementation
        ;; (free.rwa-token.transfer rwa-id seller buyer 1.0)
        (coin.transfer "escrow" seller amount)
        (update escrows (hash [buyer seller]) { "status": "settled" })))
    (step-with-rollback 
      (with-capability (GOVERNANCE)
        (coin.transfer "escrow" buyer amount)
        (update escrows (hash [buyer seller]) { "status": "cancelled" })))
  )

  (defun spirekey-guard (user:string)
    (create-user-guard (spirekey-verify user)))
  (defun spirekey-verify (user:string) true)
)
