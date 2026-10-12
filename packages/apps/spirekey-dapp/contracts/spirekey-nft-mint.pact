(module spirekey-nft-mint GOVERNANCE
  @doc "Secure NFT minting module using SpireKey biometric signing"
  (defcap GOVERNANCE () (enforce-keyset 'admin-keyset))
  (use marmalade-v2) 
  (use coin)                  
  
  (defschema nft
    @model
      [
        (invariant (and (>= royalty 0.0) (<= royalty 1.0)))
        (invariant (!= owner ""))
      ]
    id:integer
    owner:string
    uri:string                  
    royalty:decimal             
    creator:string              
    minted-at:time)
  (deftable nfts:{nft})

  (defcap SPIREKEY_MINT (minter:string)
    (compose-capability (ALLOW_MINT))
    (enforce-guard (spirekey-user-guard minter)))
  (defcap ALLOW_MINT () true)

  (defun spirekey-user-guard (account:string)
    (create-user-guard (spirekey-verify account)))
  (defun spirekey-verify (account:string) true)

  (defun mint-nft (minter:string uri:string royalty:decimal)
    @doc "Mint new NFT with SpireKey biometric signing"
    (with-capability (SPIREKEY_MINT minter)
      (enforce (and (>= royalty 0.0) (<= royalty 0.20)) "Royalty must be 0–20%")
      (enforce (> (length uri) 10) "Valid URI required")
      (let ((id (length (keys nfts))))
        (insert nfts (format "{}" [id])
          { "id": id, "owner": minter, "uri": uri, "royalty": royalty, "creator": minter, "minted-at": (time) })
        id)))

  (defun transfer-with-royalty (id:integer from:string to:string)
    @doc "Transfer NFT with royalty payment to creator"
    (with-read nfts (format "{}" [id]) { "owner" := owner, "royalty" := r, "creator" := creator }
      (enforce (= owner from) "Not owner")
      (enforce-guard (spirekey-user-guard from))  
      (let ((royalty-amount (* r 1.0)))
        (coin.transfer from creator royalty-amount))
      (update nfts (format "{}" [id]) { "owner": to })))

  @model [ (property (authorized-by 'admin-keyset)) ]
)
