import { supabase } from '@/integrations/supabase/client';

export interface BlockchainTransaction {
  id: string;
  hash: string;
  orderId: string;
  timestamp: string;
  blockNumber: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'verified' | 'failed';
  gasUsed: number;
  gasPrice: string;
  from: string;
  to: string;
  data: string;
}

export interface SmartContract {
  address: string;
  abi: any[];
  bytecode: string;
  deployedAt: string;
  verified: boolean;
}

export interface VerificationProof {
  orderId: string;
  transactionHash: string;
  merkleRoot: string;
  timestamp: string;
  verifiedBy: string;
  signature: string;
  blockchain: string;
}

export interface NFTCertificate {
  tokenId: string;
  orderId: string;
  owner: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  contractAddress: string;
  blockchain: string;
}

class BlockchainVerificationService {
  private web3: any = null;
  private contracts: Map<string, SmartContract> = new Map();
  private currentChain: string = 'ethereum';
  private verificationCache: Map<string, VerificationProof> = new Map();

  constructor() {
    this.initializeWeb3();
    this.loadContracts();
  }

  private async initializeWeb3(): Promise<void> {
    try {
      // Initialize Web3 with provider
      if ((window as any).ethereum) {
        this.web3 = new (window as any).Web3((window as any).ethereum);
        await this.switchToOptimalChain();
      } else {
        // Fallback to public RPC
        this.web3 = new (window as any).Web3(new (window as any).Web3.providers.HttpProvider(
          'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
        ));
      }
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
      this.web3 = null;
    }
  }

  private async switchToOptimalChain(): Promise<void> {
    try {
      // Switch to Polygon for lower gas fees
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // Polygon Mainnet
      });
      this.currentChain = 'polygon';
    } catch (error) {
      // Fallback to Ethereum
      this.currentChain = 'ethereum';
    }
  }

  private loadContracts(): void {
    // Load smart contract ABIs and addresses
    const orderVerificationContract: SmartContract = {
      address: '0x1234567890123456789012345678901234567890',
      abi: [
        {
          "inputs": [{"internalType": "string", "name": "orderId", "type": "string"}],
          "name": "verifyOrder",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"internalType": "string", "name": "orderId", "type": "string"}],
          "name": "mintCertificate",
          "outputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      bytecode: '0x608060405234801561001057600080fd5b50...',
      deployedAt: '2024-01-01T00:00:00Z',
      verified: true
    };

    this.contracts.set('orderVerification', orderVerificationContract);
  }

  async createOrderVerification(orderId: string, orderData: any): Promise<BlockchainTransaction> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      // Create order hash
      const orderHash = this.createOrderHash(orderId, orderData);
      
      // Get user account
      const accounts = await this.web3.eth.getAccounts();
      const fromAddress = accounts[0];

      // Build transaction
      const contract = this.contracts.get('orderVerification');
      const contractInstance = new this.web3.eth.Contract(contract!.abi, contract!.address);

      const transactionData = contractInstance.methods.verifyOrder(orderId).encodeABI();

      const tx = {
        from: fromAddress,
        to: contract!.address,
        data: transactionData,
        gas: await this.estimateGas(fromAddress, contract!.address, transactionData),
        gasPrice: await this.getGasPrice(),
        nonce: await this.web3.eth.getTransactionCount(fromAddress)
      };

      // Sign and send transaction
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, await this.getPrivateKey());
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      const blockchainTx: BlockchainTransaction = {
        id: receipt.transactionHash,
        hash: receipt.transactionHash,
        orderId,
        timestamp: new Date().toISOString(),
        blockNumber: receipt.blockNumber,
        confirmations: receipt.confirmations || 0,
        status: receipt.status ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed,
        gasPrice: tx.gasPrice,
        from: tx.from,
        to: tx.to,
        data: tx.data
      };

      // Save to database
      await this.saveBlockchainTransaction(blockchainTx);

      return blockchainTx;
    } catch (error) {
      console.error('Error creating order verification:', error);
      throw error;
    }
  }

  private createOrderHash(orderId: string, orderData: any): string {
    const data = JSON.stringify({
      orderId,
      customerName: orderData.customer_name,
      productName: orderData.product_name,
      amount: orderData.total_amount,
      timestamp: orderData.order_date
    });

    return this.web3.utils.sha3(data) || '';
  }

  private async estimateGas(from: string, to: string, data: string): Promise<number> {
    try {
      return await this.web3.eth.estimateGas({ from, to, data });
    } catch (error) {
      return 21000; // Default gas limit
    }
  }

  private async getGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      return this.web3.utils.toHex(gasPrice);
    } catch (error) {
      return '0x4A817C800'; // 20 Gwei
    }
  }

  private async getPrivateKey(): Promise<string> {
    // In production, this would be securely stored
    return '0x1234567890123456789012345678901234567890123456789012345678901234';
  }

  async verifyOrderOnBlockchain(orderId: string): Promise<VerificationProof> {
    // Check cache first
    const cached = this.verificationCache.get(orderId);
    if (cached) {
      return cached;
    }

    try {
      // Get transaction from database
      const transaction = await this.getBlockchainTransaction(orderId);
      if (!transaction) {
        throw new Error('No blockchain transaction found for this order');
      }

      // Verify on blockchain
      const contract = this.contracts.get('orderVerification');
      const contractInstance = new this.web3.eth.Contract(contract!.abi, contract!.address);

      const isVerified = await contractInstance.methods.verifyOrder(orderId).call();
      
      if (!isVerified) {
        throw new Error('Order verification failed on blockchain');
      }

      // Create verification proof
      const proof: VerificationProof = {
        orderId,
        transactionHash: transaction.hash,
        merkleRoot: this.calculateMerkleRoot(orderId),
        timestamp: new Date().toISOString(),
        verifiedBy: this.web3.eth.defaultAccount,
        signature: await this.signVerification(orderId, transaction.hash),
        blockchain: this.currentChain
      };

      // Cache and save
      this.verificationCache.set(orderId, proof);
      await this.saveVerificationProof(proof);

      return proof;
    } catch (error) {
      console.error('Error verifying order on blockchain:', error);
      throw error;
    }
  }

  private calculateMerkleRoot(orderId: string): string {
    // Simplified Merkle root calculation
    const data = orderId + Date.now().toString();
    return this.web3.utils.sha3(data) || '';
  }

  private async signVerification(orderId: string, transactionHash: string): Promise<string> {
    const message = this.web3.utils.utf8ToHex(`${orderId}:${transactionHash}`);
    const signature = await this.web3.eth.personal.sign(message, this.web3.eth.defaultAccount);
    return signature;
  }

  async mintOrderNFT(orderId: string, orderData: any): Promise<NFTCertificate> {
    try {
      // Create NFT metadata
      const metadata = {
        name: `${orderData.product_name} - Order Certificate`,
        description: `Blockchain-verified certificate for order ${orderId}`,
        image: orderData.product_image || '/default-product.png',
        attributes: [
          {
            trait_type: 'Order ID',
            value: orderId
          },
          {
            trait_type: 'Product',
            value: orderData.product_name
          },
          {
            trait_type: 'Brand',
            value: orderData.product_brand
          },
          {
            trait_type: 'Price',
            value: `₹${orderData.total_amount}`
          },
          {
            trait_type: 'Date',
            value: new Date(orderData.order_date).toLocaleDateString()
          },
          {
            trait_type: 'Status',
            value: 'Verified'
          }
        ]
      };

      // Mint NFT
      const tokenId = await this.mintNFTToken(orderId, metadata);
      
      const nftCertificate: NFTCertificate = {
        tokenId,
        orderId,
        owner: this.web3.eth.defaultAccount,
        metadata,
        contractAddress: this.contracts.get('orderVerification')!.address,
        blockchain: this.currentChain
      };

      // Save NFT certificate
      await this.saveNFTCertificate(nftCertificate);

      return nftCertificate;
    } catch (error) {
      console.error('Error minting order NFT:', error);
      throw error;
    }
  }

  private async mintNFTToken(orderId: string, metadata: any): Promise<string> {
    const contract = this.contracts.get('orderVerification');
    const contractInstance = new this.web3.eth.Contract(contract!.abi, contract!.address);

    const accounts = await this.web3.eth.getAccounts();
    const fromAddress = accounts[0];

    const tx = contractInstance.methods.mintCertificate(orderId);
    const receipt = await tx.send({
      from: fromAddress,
      gas: await tx.estimateGas({ from: fromAddress })
    });

    return receipt.events.CertificateMinted.returnValues.tokenId;
  }

  async getVerificationStatus(orderId: string): Promise<{
    verified: boolean;
    transactionHash?: string;
    confirmations?: number;
    nftTokenId?: string;
  }> {
    try {
      const transaction = await this.getBlockchainTransaction(orderId);
      if (!transaction) {
        return { verified: false };
      }

      const currentBlock = await this.web3.eth.getBlockNumber();
      const confirmations = currentBlock - transaction.blockNumber;

      const nftCertificate = await this.getNFTCertificate(orderId);

      return {
        verified: transaction.status === 'confirmed' && confirmations > 0,
        transactionHash: transaction.hash,
        confirmations,
        nftTokenId: nftCertificate?.tokenId
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { verified: false };
    }
  }

  async generateQRCode(orderId: string): Promise<string> {
    const verificationUrl = `${window.location.origin}/verify?order=${orderId}&blockchain=true`;
    
    // Generate QR code (would use a QR code library in production)
    const qrData = JSON.stringify({
      orderId,
      verificationUrl,
      blockchain: this.currentChain,
      timestamp: new Date().toISOString()
    });

    return btoa(qrData); // Base64 encoded QR data
  }

  async scanQRCode(qrData: string): Promise<{
    orderId: string;
    verificationUrl: string;
    blockchain: string;
    timestamp: string;
  }> {
    try {
      const decoded = JSON.parse(atob(qrData));
      return decoded;
    } catch (error) {
      throw new Error('Invalid QR code format');
    }
  }

  // Database operations
  private async saveBlockchainTransaction(tx: BlockchainTransaction): Promise<void> {
    try {
      await supabase
        .from('blockchain_transactions')
        .insert([{
          id: tx.id,
          hash: tx.hash,
          order_id: tx.orderId,
          timestamp: tx.timestamp,
          block_number: tx.blockNumber,
          confirmations: tx.confirmations,
          status: tx.status,
          gas_used: tx.gasUsed,
          gas_price: tx.gasPrice,
          from_address: tx.from,
          to_address: tx.to,
          data: tx.data,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error saving blockchain transaction:', error);
    }
  }

  private async getBlockchainTransaction(orderId: string): Promise<BlockchainTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('blockchain_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        hash: data.hash,
        orderId: data.order_id,
        timestamp: data.timestamp,
        blockNumber: data.block_number,
        confirmations: data.confirmations,
        status: data.status,
        gasUsed: data.gas_used,
        gasPrice: data.gas_price,
        from: data.from_address,
        to: data.to_address,
        data: data.data
      };
    } catch (error) {
      console.error('Error fetching blockchain transaction:', error);
      return null;
    }
  }

  private async saveVerificationProof(proof: VerificationProof): Promise<void> {
    try {
      await supabase
        .from('verification_proofs')
        .insert([{
          order_id: proof.orderId,
          transaction_hash: proof.transactionHash,
          merkle_root: proof.merkleRoot,
          timestamp: proof.timestamp,
          verified_by: proof.verifiedBy,
          signature: proof.signature,
          blockchain: proof.blockchain,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error saving verification proof:', error);
    }
  }

  private async saveNFTCertificate(certificate: NFTCertificate): Promise<void> {
    try {
      await supabase
        .from('nft_certificates')
        .insert([{
          token_id: certificate.tokenId,
          order_id: certificate.orderId,
          owner: certificate.owner,
          metadata: certificate.metadata,
          contract_address: certificate.contractAddress,
          blockchain: certificate.blockchain,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error saving NFT certificate:', error);
    }
  }

  private async getNFTCertificate(orderId: string): Promise<NFTCertificate | null> {
    try {
      const { data, error } = await supabase
        .from('nft_certificates')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) throw error;
      
      return {
        tokenId: data.token_id,
        orderId: data.order_id,
        owner: data.owner,
        metadata: data.metadata,
        contractAddress: data.contract_address,
        blockchain: data.blockchain
      };
    } catch (error) {
      console.error('Error fetching NFT certificate:', error);
      return null;
    }
  }

  // Utility methods
  getCurrentChain(): string {
    return this.currentChain;
  }

  isWeb3Connected(): boolean {
    return this.web3 !== null;
  }

  async getAccountBalance(): Promise<string> {
    if (!this.web3) return '0';
    
    const accounts = await this.web3.eth.getAccounts();
    const balance = await this.web3.eth.getBalance(accounts[0]);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: number;
    blockNumber: number;
    gasUsed: number;
  }> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    const receipt = await this.web3.eth.getTransactionReceipt(txHash);
    return {
      status: receipt.status || 0,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed
    };
  }
}

export const blockchainVerificationService = new BlockchainVerificationService();
