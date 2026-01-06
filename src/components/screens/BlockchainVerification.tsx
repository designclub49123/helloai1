import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Link, 
  QrCode, 
  Award, 
  Globe, 
  Zap, 
  Clock, 
  Hash, 
  Database, 
  Network, 
  Key, 
  FileText,
  ExternalLink,
  Copy,
  Download,
  Share2,
  TrendingUp,
  Lock
} from 'lucide-react';
import { blockchainVerificationService, VerificationProof, NFTCertificate } from '@/services/blockchainVerificationService';

export function BlockchainVerification() {
  const [orderId, setOrderId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [verificationProof, setVerificationProof] = useState<VerificationProof | null>(null);
  const [nftCertificate, setNftCertificate] = useState<NFTCertificate | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [blockchainInfo, setBlockchainInfo] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load blockchain info
    loadBlockchainInfo();
    
    // Set default order ID for demo
    setOrderId('OD20240115001');
  }, []);

  const loadBlockchainInfo = () => {
    setBlockchainInfo({
      chain: 'Polygon',
      blockNumber: 45678901,
      gasPrice: '30 Gwei',
      confirmations: 12,
      networkStatus: 'healthy',
      lastBlock: '2 mins ago',
      totalTransactions: 1234567890
    });
  };

  const verifyOrder = async () => {
    if (!orderId) return;
    
    setIsVerifying(true);
    try {
      // Get verification status
      const status = await blockchainVerificationService.getVerificationStatus(orderId);
      setVerificationStatus(status);
      
      if (status.verified) {
        // Get verification proof
        const proof = await blockchainVerificationService.verifyOrderOnBlockchain(orderId);
        setVerificationProof(proof);
        
        // Get NFT certificate
        const nft = await blockchainVerificationService.mintOrderNFT(orderId, {
          product_name: 'iPhone 15 Pro',
          product_brand: 'Apple',
          total_amount: 89999,
          order_date: '2024-01-15T10:00:00Z',
          product_image: '/iphone-15-pro.jpg'
        });
        setNftCertificate(nft);
        
        // Generate QR code
        const qr = await blockchainVerificationService.generateQRCode(orderId);
        setQrCode(qr);
        
        // Load transaction history
        loadTransactionHistory(orderId);
      }
    } catch (error) {
      console.error('Error verifying order:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const loadTransactionHistory = async (orderId: string) => {
    // Mock transaction history
    const history = [
      {
        hash: '0x1234567890abcdef...',
        timestamp: '2024-01-15T10:05:00Z',
        type: 'order_created',
        status: 'confirmed',
        blockNumber: 45678890,
        gasUsed: 21000,
        confirmations: 12
      },
      {
        hash: '0xabcdef1234567890...',
        timestamp: '2024-01-15T10:10:00Z',
        type: 'order_verified',
        status: 'confirmed',
        blockNumber: 45678891,
        gasUsed: 45000,
        confirmations: 11
      },
      {
        hash: '0x7890abcdef123456...',
        timestamp: '2024-01-15T10:15:00Z',
        type: 'nft_minted',
        status: 'confirmed',
        blockNumber: 45678892,
        gasUsed: 85000,
        confirmations: 10
      }
    ];
    
    setTransactionHistory(history);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (hash: string) => {
    window.open(`https://polygonscan.com/tx/${hash}`, '_blank');
  };

  const downloadCertificate = () => {
    // Create certificate download
    const certificateData = {
      orderId,
      verificationProof,
      nftCertificate,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-certificate-${orderId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareVerification = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Blockchain Verified Order',
        text: `Order ${orderId} is verified on blockchain!`,
        url: window.location.href
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-black/20 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative">
                <Shield className="w-12 h-12 text-green-400" />
                <Zap className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">Blockchain Verification</CardTitle>
                <CardDescription className="text-green-200">
                  100% tamper-proof order verification on blockchain
                </CardDescription>
              </div>
            </div>
            
            {/* Blockchain Status */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                <Network className="w-3 h-3 mr-1" />
                {blockchainInfo?.chain} Network
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Hash className="w-3 h-3 mr-1" />
                Block #{blockchainInfo?.blockNumber?.toLocaleString()}
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Clock className="w-3 h-3 mr-1" />
                {blockchainInfo?.lastBlock}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Verification Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Verification */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Verification */}
            <Card className="bg-black/20 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Order Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Enter Order ID"
                    className="flex-1 p-3 bg-black/30 border border-green-500/20 rounded text-white placeholder-green-400"
                  />
                  <Button
                    onClick={verifyOrder}
                    disabled={isVerifying || !orderId}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </>
                    )}
                  </Button>
                </div>

                {/* Verification Status */}
                {verificationStatus && (
                  <div className={`p-4 rounded-lg border ${
                    verificationStatus.verified
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {verificationStatus.verified ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          verificationStatus.verified ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {verificationStatus.verified ? '✅ VERIFIED ON BLOCKCHAIN' : '❌ NOT VERIFIED'}
                        </h3>
                        <p className="text-white text-sm">
                          {verificationStatus.verified 
                            ? `Order ${orderId} is cryptographically verified`
                            : 'Order not found or verification failed'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Proof */}
                {verificationProof && (
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold">Verification Proof</h4>
                    <div className="bg-black/30 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-green-300">Transaction Hash:</span>
                        <div className="flex items-center space-x-2">
                          <code className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                            {verificationProof.transactionHash.slice(0, 10)}...
                          </code>
                          <Button
                            onClick={() => copyToClipboard(verificationProof.transactionHash)}
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => openInExplorer(verificationProof.transactionHash)}
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Blockchain:</span>
                        <span className="text-white">{verificationProof.blockchain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Verified By:</span>
                        <span className="text-white">{verificationProof.verifiedBy.slice(0, 10)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Timestamp:</span>
                        <span className="text-white">{new Date(verificationProof.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Merkle Root:</span>
                        <code className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                          {verificationProof.merkleRoot.slice(0, 15)}...
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NFT Certificate */}
            {nftCertificate && (
              <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    NFT Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 border border-purple-500/30">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-12 h-12 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {nftCertificate.metadata.name}
                      </h3>
                      <p className="text-purple-300 mb-4">
                        {nftCertificate.metadata.description}
                      </p>
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-300">
                          Token ID: #{nftCertificate.tokenId}
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-300">
                          {nftCertificate.blockchain}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* NFT Attributes */}
                  <div>
                    <h4 className="text-white font-semibold mb-2">Attributes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {nftCertificate.metadata.attributes.map((attr, index) => (
                        <div key={index} className="bg-black/30 rounded p-2">
                          <p className="text-purple-300 text-xs">{attr.trait_type}</p>
                          <p className="text-white text-sm font-semibold">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NFT Actions */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={downloadCertificate}
                      variant="outline"
                      className="border-purple-500/30 text-purple-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={shareVerification}
                      variant="outline"
                      className="border-purple-500/30 text-purple-300"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      onClick={() => window.open(`https://opensea.io/assets/polygon/${nftCertificate.contractAddress}/${nftCertificate.tokenId}`, '_blank')}
                      variant="outline"
                      className="border-purple-500/30 text-purple-300"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on OpenSea
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactionHistory.map((tx, index) => (
                      <div key={index} className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-white font-semibold capitalize">
                              {tx.type.replace('_', ' ')}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-300">
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-blue-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Hash:</span>
                            <div className="flex items-center space-x-2">
                              <code>{tx.hash.slice(0, 10)}...</code>
                              <Button
                                onClick={() => openInExplorer(tx.hash)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 p-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span>Block:</span>
                            <span>#{tx.blockNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gas Used:</span>
                            <span>{tx.gasUsed.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time:</span>
                            <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            {qrCode && (
              <Card className="bg-black/20 border-yellow-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    Verification QR
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-black" />
                  </div>
                  <p className="text-yellow-300 text-sm mb-4">
                    Scan to verify authenticity
                  </p>
                  <Button
                    onClick={() => copyToClipboard(qrCode)}
                    variant="outline"
                    className="border-yellow-500/30 text-yellow-300"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy QR Data
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Blockchain Info */}
            <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Network Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-300">Network:</span>
                  <span className="text-white">{blockchainInfo?.chain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Gas Price:</span>
                  <span className="text-white">{blockchainInfo?.gasPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Confirmations:</span>
                  <span className="text-white">{blockchainInfo?.confirmations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Status:</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-300">
                    {blockchainInfo?.networkStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Total Tx:</span>
                  <span className="text-white">{blockchainInfo?.totalTransactions?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card className="bg-black/20 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Cryptographic Hash</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Merkle Tree Proof</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Digital Signature</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Immutable Ledger</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">Smart Contract</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">NFT Certificate</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Advanced</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  variant="outline"
                  className="border-purple-500/30 text-purple-300 w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Details
                </Button>
                
                {showAdvanced && verificationProof && (
                  <div className="mt-4 space-y-2">
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-purple-300 text-xs mb-1">Signature:</p>
                      <code className="text-white text-xs break-all">
                        {verificationProof.signature}
                      </code>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
