import { supabase } from '@/integrations/supabase/client';
import { predictiveService, DeliveryPrediction } from './predictiveService';
import { businessInsightsService } from './businessInsightsService';
import { visualRecognitionService } from './visualRecognitionService';

const OPENROUTER_API_KEY = "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";
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  customer_country: string;
  product_id: string;
  product_name: string;
  product_category: string;
  product_subcategory: string;
  product_brand: string;
  product_color: string | null;
  product_size: string | null;
  product_price: number;
  quantity: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  shipping_fee: number;
  total_amount: number;
  order_status: string;
  payment_method: string;
  payment_status: string;
  payment_id: string | null;
  order_date: string;
  confirmed_date: string | null;
  packed_date: string | null;
  shipped_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  current_location: string | null;
  seller_name: string;
  seller_rating: number | null;
  order_notes: string | null;
  is_gift: boolean;
  gift_message: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

function formatOrderForDisplay(order: Order): string {
  return `
📦 **Order: ${order.order_id}**
- Customer: ${order.customer_name}
- Email: ${order.customer_email}
- Phone: ${order.customer_phone}
- Address: ${order.customer_address}, ${order.customer_city}, ${order.customer_state} - ${order.customer_pincode}
- Product: ${order.product_name} (${order.product_category})
- Brand: ${order.product_brand}
- Color: ${order.product_color || 'N/A'}
- Size: ${order.product_size || 'N/A'}
- Price: ₹${order.product_price} × ${order.quantity} = ₹${order.total_amount}
- Status: ${order.order_status}
- Payment: ${order.payment_method} (${order.payment_status})
- Tracking: ${order.tracking_number || 'N/A'}
- Carrier: ${order.carrier_name || 'N/A'}
- Current Location: ${order.current_location || 'N/A'}
- Order Date: ${formatDate(order.order_date)}
- Expected Delivery: ${formatDate(order.expected_delivery)}
${order.actual_delivery ? `- Delivered On: ${formatDate(order.actual_delivery)}` : ''}
- Seller: ${order.seller_name}
${order.seller_rating ? `- Seller Rating: ⭐${order.seller_rating}/5` : ''}
${order.order_notes ? `- Notes: ${order.order_notes}` : ''}
${order.is_gift ? '- 🎁 This is a gift order' : ''}
${order.gift_message ? `- Gift Message: ${order.gift_message}` : ''}
  `.trim();
}

async function getRelevantOrderData(userMessage: string): Promise<string> {
  const lowerMessage = userMessage.toLowerCase();
  let results: string[] = [];
  
  // Check for specific order ID
  const orderIdMatch = lowerMessage.match(/od\d+/i);
  if (orderIdMatch) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_id', `%${orderIdMatch[0]}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      results.push(`Found order:\n${formatOrderForDisplay(data[0])}`);
    }
  }

  // Check for customer name search
  const namePatterns = ["order for", "orders of", "track order of", "find order for", "orders by", "customer", "my order"];
  for (const pattern of namePatterns) {
    if (lowerMessage.includes(pattern)) {
      const nameStart = lowerMessage.indexOf(pattern) + pattern.length;
      const possibleName = userMessage.substring(nameStart).trim().split(/[,.\?!]/)[0].trim();
      if (possibleName.length > 2) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .ilike('customer_name', `%${possibleName}%`)
          .order('order_date', { ascending: false })
          .limit(5);
        
        if (data && data.length > 0) {
          results.push(`Found ${data.length} order(s) for "${possibleName}":\n${data.map(formatOrderForDisplay).join('\n\n')}`);
        }
      }
    }
  }

  // Check for status-based queries
  const statusKeywords: Record<string, string> = {
    "delivered": "Delivered",
    "in transit": "In Transit",
    "shipped": "Shipped",
    "pending": "Order Placed",
    "cancelled": "Cancelled",
    "out for delivery": "Out for Delivery",
    "confirmed": "Confirmed",
    "packed": "Packed"
  };

  for (const [keyword, status] of Object.entries(statusKeywords)) {
    if (lowerMessage.includes(keyword)) {
      const { data, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('order_status', status)
        .order('order_date', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        results.push(`Found ${count} orders with status "${status}":\n${data.map(formatOrderForDisplay).join('\n\n')}${(count || 0) > 5 ? `\n\n...and ${(count || 0) - 5} more orders.` : ''}`);
      }
    }
  }

  // Check for product/brand searches
  const productPatterns = ["product", "brand", "item", "buy", "purchase"];
  for (const pattern of productPatterns) {
    if (lowerMessage.includes(pattern)) {
      const searchTerms = userMessage.match(/\b[a-zA-Z]{3,}\b/g);
      if (searchTerms) {
        for (const term of searchTerms) {
          if (!["the", "what", "where", "when", "how", "can", "you", "find", "show", "get", "tell", "about", "order", "tracking", "product", "brand"].includes(term.toLowerCase())) {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .or(`product_name.ilike.%${term}%,product_brand.ilike.%${term}%,product_category.ilike.%${term}%`)
              .order('order_date', { ascending: false })
              .limit(3);
            
            if (data && data.length > 0) {
              results.push(`Found ${data.length} order(s) matching "${term}":\n${data.map(formatOrderForDisplay).join('\n\n')}`);
            }
          }
        }
      }
    }
  }

  // Check for location-based queries
  const locationPatterns = ["location", "where", "city", "state", "address"];
  for (const pattern of locationPatterns) {
    if (lowerMessage.includes(pattern)) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .not('current_location', 'is', null)
        .order('order_date', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        results.push(`Found ${data.length} orders with current location info:\n${data.map(formatOrderForDisplay).join('\n\n')}`);
      }
    }
  }

  // Check for statistics queries
  if (lowerMessage.includes("statistics") || lowerMessage.includes("stats") || lowerMessage.includes("summary") || lowerMessage.includes("overview") || lowerMessage.includes("how many") || lowerMessage.includes("total")) {
    const { data } = await supabase.from('orders').select('order_status, total_amount, product_category, product_brand');
    
    if (data) {
      const total = data.length;
      const delivered = data.filter(o => o.order_status === 'Delivered').length;
      const inTransit = data.filter(o => ['In Transit', 'Shipped', 'Out for Delivery'].includes(o.order_status)).length;
      const pending = data.filter(o => ['Order Placed', 'Confirmed', 'Packed'].includes(o.order_status)).length;
      const cancelled = data.filter(o => ['Cancelled', 'Returned'].includes(o.order_status)).length;
      const totalRevenue = data.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      // Category breakdown
      const categoryStats = data.reduce((acc, o) => {
        acc[o.product_category] = (acc[o.product_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Brand breakdown
      const brandStats = data.reduce((acc, o) => {
        acc[o.product_brand] = (acc[o.product_brand] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');
      
      const topBrands = Object.entries(brandStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([brand, count]) => `${brand}: ${count}`)
        .join(', ');
      
      results.push(`📊 **Order Statistics:**\n- Total Orders: ${total}\n- Delivered: ${delivered}\n- In Transit: ${inTransit}\n- Pending: ${pending}\n- Cancelled: ${cancelled}\n- Total Revenue: ₹${Math.round(totalRevenue).toLocaleString()}\n- Average Order Value: ₹${Math.round(totalRevenue / total).toLocaleString()}\n\n📦 **Top Categories:** ${topCategories}\n\n🏷️ **Top Brands:** ${topBrands}`);
    }
  }

  // Check for tracking queries
  if (lowerMessage.includes("tracking") || lowerMessage.includes("track")) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .order('order_date', { ascending: false })
      .limit(5);
    
    if (data && data.length > 0) {
      results.push(`Found ${data.length} orders with tracking numbers:\n${data.map(formatOrderForDisplay).join('\n\n')}`);
    }
  }

  // Check for recent orders
  if (lowerMessage.includes("recent") || lowerMessage.includes("latest") || lowerMessage.includes("new")) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(5);
    
    if (data && data.length > 0) {
      results.push(`Recent orders:\n${data.map(formatOrderForDisplay).join('\n\n')}`);
    }
  }

  return results.join('\n\n---\n\n');
}

export async function getAIResponse(userMessage: string, conversationHistory: any[] = []): Promise<string> {
  try {
    // Get relevant order data
    const relevantData = await getRelevantOrderData(userMessage);
    
    // Get predictive insights for relevant orders
    let predictiveInsights = "";
    if (relevantData && relevantData.trim()) {
      try {
        // Extract order IDs from the relevant data
        const orderIds: string[] = [];
        const orderIdMatches = relevantData.match(/Order ID: ([^\s]+)/g);
        if (orderIdMatches) {
          orderIdMatches.forEach(match => {
            const orderId = match.replace('Order ID: ', '');
            orderIds.push(orderId);
          });
        }
        
        if (orderIds.length > 0) {
          const predictions = await predictiveService.predictDeliveryDelays(orderIds);
          
          if (predictions.length > 0) {
            const highRiskOrders = predictions.filter(p => p.delayProbability > 50);
            if (highRiskOrders.length > 0) {
              predictiveInsights = `
              
🚨 **PREDICTIVE INTELLIGENCE ALERT** 🚨
${highRiskOrders.map(p => `
• Order ${p.orderId}: ${p.delayProbability.toFixed(0)}% delay risk
  Risk factors: ${p.riskFactors.map(rf => rf.type).join(', ')}
  Predicted delivery: ${new Date(p.predictedDeliveryDate).toLocaleDateString()}
  Recommendations: ${p.recommendations.slice(0, 2).join(', ')}
`).join('')}

⚡ **AI Prediction Summary**: ${highRiskOrders.length} order(s) at risk of delay. Consider proactive customer notification and alternative shipping options.`;
            } else {
              predictiveInsights = `
              
✅ **PREDICTIVE INTELLIGENCE**: All analyzed orders are on track with low delay risk. Current delivery estimates appear reliable based on weather, traffic, and carrier performance data.`;
            }
          }
        }
      } catch (predError) {
        console.error('Predictive service error:', predError);
        // Continue without predictive insights if there's an error
      }
    }

    // Get business insights for business-related queries
    let businessInsights = "";
    if (userMessage.toLowerCase().includes('business') || 
        userMessage.toLowerCase().includes('revenue') || 
        userMessage.toLowerCase().includes('sales') || 
        userMessage.toLowerCase().includes('customer') || 
        userMessage.toLowerCase().includes('product') || 
        userMessage.toLowerCase().includes('analytics') || 
        userMessage.toLowerCase().includes('insights') || 
        userMessage.toLowerCase().includes('performance')) {
      try {
        const insights = await businessInsightsService.getBusinessInsights();
        
        businessInsights = `

📊 **BUSINESS INTELLIGENCE DASHBOARD** 📊

**Revenue Overview:**
• Total Revenue: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(insights.revenue.totalRevenue)}
• Revenue Growth: ${insights.revenue.revenueGrowth.toFixed(1)}%
• Average Order Value: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(insights.revenue.averageOrderValue)}

**Customer Analytics:**
• Total Customers: ${insights.customerBehavior.totalCustomers.toLocaleString()}
• Customer Retention Rate: ${insights.customerBehavior.customerRetentionRate.toFixed(1)}%
• Average Orders per Customer: ${insights.customerBehavior.averageOrdersPerCustomer.toFixed(1)}

**Product Performance:**
• Total Products: ${insights.productPerformance.totalProducts}
• Top Product: ${insights.productPerformance.topSellingProducts[0]?.name || 'N/A'}
• Top Category: ${insights.productPerformance.categoryPerformance[0]?.category || 'N/A'}

**Geographic Reach:**
• Active Regions: ${insights.geographicSales.totalRegions}
• Top Region: ${insights.geographicSales.topRegions[0]?.region || 'N/A'}

**Forecast:**
• Next Month Revenue: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(insights.predictiveForecast.nextMonthRevenue)}
• Growth Trend: ${insights.predictiveForecast.growthTrend}
• Confidence: ${insights.predictiveForecast.confidence.toFixed(0)}%

**Key Insights:**
${insights.keyInsights.slice(0, 3).map(insight => `• ${insight}`).join('\n')}

**Recommendations:**
${insights.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;
      } catch (businessError) {
        console.error('Business insights service error:', businessError);
        // Continue without business insights if there's an error
      }
    }

    // Handle visual recognition requests
    let visualRecognitionInfo = "";
    if (userMessage.toLowerCase().includes('scan') || 
        userMessage.toLowerCase().includes('recognize') || 
        userMessage.toLowerCase().includes('image') || 
        userMessage.toLowerCase().includes('photo') || 
        userMessage.toLowerCase().includes('receipt') || 
        userMessage.toLowerCase().includes('invoice') || 
        userMessage.toLowerCase().includes('visual')) {
      
      visualRecognitionInfo = `

📸 **VISUAL ORDER RECOGNITION** 📸

I can help you extract order information from images! Here's what you can do:

**What you can scan:**
• Order receipts and invoices
• Shipping labels and tracking numbers
• Product packaging and labels
• Order confirmation emails
• Purchase orders

**How it works:**
1. Go to the "Scan" tab in the app
2. Take a photo or upload an image
3. AI will automatically extract text and order details
4. Match with existing orders in our database
5. Get instant results and suggestions

**Features:**
• OCR text extraction with high accuracy
• Automatic order matching
• Confidence scoring
• Quality analysis
• Smart suggestions

**Supported formats:**
• JPEG, PNG, WebP images
• Maximum file size: 10MB
• Camera capture or gallery upload

Try it now! Navigate to the Scan tab and upload your order document.`;
    }
  
    const systemPrompt = `You are ARKIO, an advanced AI assistant for order tracking and customer support. You have access to a comprehensive database of orders with detailed information including:

- Order IDs (format: OD followed by numbers)
- Complete customer information: names, emails, phones, full addresses with city, state, pincode
- Detailed product information: name, category, subcategory, brand, color, size, price, quantity
- Order lifecycle: dates (order, confirmed, packed, shipped, delivery), status tracking
- Payment details: method, status, transaction IDs
- Shipping information: tracking numbers, carrier names, current locations
- Seller information: names, ratings
- Additional details: gift orders, special notes, discounts, taxes

${relevantData ? `\n**RELEVANT DATA FROM DATABASE:**\n${relevantData}\n` : ''}

${predictiveInsights ? `\n${predictiveInsights}\n` : ''}

${businessInsights ? `\n${businessInsights}\n` : ''}

${visualRecognitionInfo ? `\n${visualRecognitionInfo}\n` : ''}

**RESPONSE GUIDELINES:**
1. **Use Database Data First**: Always prioritize the actual database data provided above
2. **Include Predictive Insights**: When predictive intelligence is available, highlight it prominently
3. **Be Comprehensive**: Include all relevant details from the database when answering
4. **Format Clearly**: Use structured formatting with bullet points and clear sections
5. **Be Proactive**: If you see data, provide insights and next steps
6. **Handle Multiple Results**: When multiple orders are found, summarize and offer to focus on specific ones
7. **Status Updates**: Explain what each status means and expected next steps
8. **Tracking Info**: Always provide current location and carrier details when available
9. **Payment Info**: Include payment method, status, and any relevant financial details
10. **Customer Service**: Offer helpful suggestions based on the order data

**COMMON QUERY TYPES:**
- Order ID lookup: Provide complete order details
- Customer name search: Show all their orders with summaries
- Status queries: List orders by status and explain what it means
- Product/brand searches: Find relevant orders and product details
- Location tracking: Show current shipping locations and delivery estimates
- Statistics: Provide comprehensive business insights
- Recent orders: Show latest activity
- Predictive insights: Highlight potential delays and recommendations

**IMPORTANT:**
- Always speak professionally but friendly
- If no data is found, ask clarifying questions (order ID, customer name, email)
- Provide actionable next steps based on order status
- Include estimated delivery dates when available
- Mention any special notes or gift information if present
- Be accurate with the database information provided
- When predictive insights are available, always mention them first`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: userMessage }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "ARKIO Order Tracker"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response format');
    }
    
    return data.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    
    if (error.name === 'AbortError') {
      return "I'm taking too long to respond. Please try again with a shorter message.";
    }
    
    return "I'm experiencing some technical difficulties connecting to my neural network. Please try again in a moment, or ask me about a specific order ID or tracking number.";
  }
}
