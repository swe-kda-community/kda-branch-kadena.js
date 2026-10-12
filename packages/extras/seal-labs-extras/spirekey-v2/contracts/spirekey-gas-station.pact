(module spirekey-gas-station GOVERNANCE
  @doc "Gas station that pays fees for SpireKey users"
  (defcap GOVERNANCE () (enforce-keyset 'admin-keyset))
  (implements gas-payer-v1)

  (defun gas-payer-guard:guard ()
    (create-user-guard (gas-check)))

  (defun gas-check ()
    (let ((signer (at 'sender (chain-data))))
      (enforce-guard (spirekey-guard signer))
      (enforce (= (at 'chain-id (chain-data)) "1") "Only chain 1")
      true))

  (defcap GAS_PAYER (user:string limit:integer price:decimal)
    (compose-capability (ALLOW_GAS)))
  (defcap ALLOW_GAS () true)

  (defun spirekey-guard (user:string)
    (create-user-guard (spirekey-verify user)))
  (defun spirekey-verify (user:string) true)
)
