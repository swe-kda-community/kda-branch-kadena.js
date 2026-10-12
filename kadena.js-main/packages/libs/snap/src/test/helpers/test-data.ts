export const MOCK_MAINNET = {
  blockExplorerAddress:
    'https://explorer.chainweb-community.org/mainnet/account/[[address]]?token=coin',
  blockExplorerAddressTransactions:
    'https://explorer.chainweb-community.org/mainnet/transfer/[[address]]?token=coin',
  blockExplorerTransaction:
    'https://explorer.chainweb-community.org/mainnet/tx/[[txHash]]',
  buyPageUrl: 'https://buy.simplex.com/?crypto=KDA',
  isTestnet: false,
  name: 'Kadena Mainnet',
  networkId: 'mainnet01',
  nodeUrl: 'https://api.chainweb-community.org/chainweb/0.0',
  transactionListTtl: 30000,
  transactionListUrl: 'https://graph.kadena.network/graphql',
};
export const MOCK_TESTNET = {
  blockExplorerAddress:
    'https://explorer.chainweb-community.org/testnet/account/[[address]]?token=coin',
  blockExplorerAddressTransactions:
    'https://explorer.chainweb-community.org/testnet/transfer/[[address]]?token=coin',
  blockExplorerTransaction:
    'https://explorer.chainweb-community.org/testnet/tx/[[txHash]]',
  buyPageUrl: 'https://faucet.testnet.chainweb.com',
  isTestnet: true,
  name: 'Kadena Testnet',
  networkId: 'testnet06',
  nodeUrl: 'https://api.testnet.chainweb-community.org/chainweb/0.0',
  transactionListTtl: 30000,
  transactionListUrl: 'https://graph.testnet.kadena.network/graphql',
};
