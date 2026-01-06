import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Data for generating realistic orders
const firstNames = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Arjun", "Meera", "Karthik", "Divya", "Rohan", "Neha", "Sanjay", "Pooja", "Arun", "Kavitha", "Rajesh", "Deepa", "Suresh", "Lakshmi"];
const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Reddy", "Nair", "Gupta", "Iyer", "Verma", "Rao", "Joshi", "Menon", "Agarwal", "Pillai", "Shah", "Nayak", "Mishra", "Desai", "Kulkarni", "Choudhury"];
const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kochi", "Chandigarh", "Coimbatore", "Indore", "Nagpur"];
const states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "West Bengal", "Maharashtra", "Gujarat", "Rajasthan", "Uttar Pradesh", "Kerala", "Punjab", "Tamil Nadu", "Madhya Pradesh", "Maharashtra"];
const productCategories = [
  { category: "Electronics", subcategories: ["Smartphones", "Laptops", "Tablets", "Headphones", "Smartwatches"], brands: ["Samsung", "Apple", "OnePlus", "Xiaomi", "Realme", "ASUS", "HP", "Dell", "Sony", "JBL"] },
  { category: "Fashion", subcategories: ["Men's Clothing", "Women's Clothing", "Footwear", "Accessories", "Watches"], brands: ["Nike", "Adidas", "Puma", "Levis", "H&M", "Zara", "Allen Solly", "Peter England", "Fastrack", "Titan"] },
  { category: "Home & Kitchen", subcategories: ["Appliances", "Cookware", "Furniture", "Decor", "Storage"], brands: ["Philips", "Prestige", "Bajaj", "Godrej", "IKEA", "Pigeon", "Milton", "Borosil", "Cello", "Tupperware"] },
  { category: "Books", subcategories: ["Fiction", "Non-Fiction", "Academic", "Self-Help", "Comics"], brands: ["Penguin", "HarperCollins", "Rupa", "McGraw Hill", "Pearson", "Oxford", "Cambridge", "Scholastic", "Arihant", "S.Chand"] },
  { category: "Sports", subcategories: ["Cricket", "Football", "Badminton", "Gym Equipment", "Yoga"], brands: ["Cosco", "Yonex", "SG", "Nivia", "Vector X", "Reebok", "Decathlon", "Wilson", "Head", "Spalding"] }
];
const productNames: Record<string, string[]> = {
  "Smartphones": ["Galaxy S23 Ultra", "iPhone 15 Pro", "OnePlus 12", "Pixel 8 Pro", "Redmi Note 13"],
  "Laptops": ["MacBook Air M2", "Dell XPS 15", "HP Pavilion", "ASUS ROG Strix", "Lenovo ThinkPad"],
  "Tablets": ["iPad Pro 12.9", "Galaxy Tab S9", "OnePlus Pad", "Xiaomi Pad 6", "Lenovo Tab P11"],
  "Headphones": ["AirPods Pro", "Sony WH-1000XM5", "JBL Tune 770NC", "Bose QC45", "Sennheiser HD 660S"],
  "Smartwatches": ["Apple Watch Series 9", "Galaxy Watch 6", "Amazfit GTR 4", "Fitbit Sense 2", "Garmin Venu 3"],
  "Men's Clothing": ["Casual Shirt", "Formal Trousers", "Denim Jeans", "Polo T-Shirt", "Blazer"],
  "Women's Clothing": ["Kurti Set", "Saree", "Western Dress", "Leggings", "Top"],
  "Footwear": ["Running Shoes", "Casual Sneakers", "Formal Shoes", "Sandals", "Sports Shoes"],
  "Accessories": ["Leather Belt", "Wallet", "Sunglasses", "Backpack", "Watch Strap"],
  "Watches": ["Analog Watch", "Digital Watch", "Smart Band", "Chronograph", "Sports Watch"],
  "Appliances": ["Mixer Grinder", "Air Fryer", "Microwave Oven", "Electric Kettle", "Vacuum Cleaner"],
  "Cookware": ["Pressure Cooker", "Non-Stick Pan", "Kadhai Set", "Tawa", "Casserole Set"],
  "Furniture": ["Study Table", "Office Chair", "Bookshelf", "Shoe Rack", "TV Unit"],
  "Decor": ["Wall Clock", "Photo Frame", "Artificial Plant", "Table Lamp", "Cushion Covers"],
  "Storage": ["Storage Box Set", "Organizer", "Wardrobe", "Drawer Unit", "Basket Set"],
  "Fiction": ["The Alchemist", "Atomic Habits", "Rich Dad Poor Dad", "Ikigai", "The Monk Who Sold"],
  "Non-Fiction": ["Sapiens", "Thinking Fast and Slow", "The Power of Habit", "Zero to One", "Start with Why"],
  "Academic": ["NCERT Physics", "HC Verma Vol 1", "RD Sharma Maths", "Wren & Martin", "Lakhmir Singh"],
  "Self-Help": ["The 5 AM Club", "Deep Work", "Mindset", "The Subtle Art", "Atomic Habits"],
  "Comics": ["Marvel Comics Set", "DC Batman", "Tinkle Digest", "Amar Chitra Katha", "Chacha Chaudhary"],
  "Cricket": ["Cricket Bat", "Cricket Ball", "Batting Gloves", "Helmet", "Pads"],
  "Football": ["Football", "Football Boots", "Shin Guards", "Goal Post", "Training Cone"],
  "Badminton": ["Badminton Racket", "Shuttlecock Pack", "Badminton Net", "Grip Tape", "Racket Bag"],
  "Gym Equipment": ["Dumbbell Set", "Yoga Mat", "Resistance Bands", "Pull Up Bar", "Skipping Rope"],
  "Yoga": ["Yoga Mat", "Yoga Block", "Yoga Strap", "Meditation Cushion", "Foam Roller"]
};
const colors = ["Black", "White", "Blue", "Red", "Green", "Grey", "Silver", "Gold", "Pink", "Navy"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40", "42"];
const orderStatuses = ["Order Placed", "Confirmed", "Packed", "Shipped", "In Transit", "Out for Delivery", "Delivered", "Cancelled", "Returned"];
const paymentMethods = ["UPI", "Credit Card", "Debit Card", "Net Banking", "Cash on Delivery", "EMI", "Wallet"];
const carriers = ["Delhivery", "BlueDart", "DTDC", "Ekart", "Shadowfax", "Xpressbees", "India Post"];
const sellers = ["Flipkart Assured", "RetailNet", "SuperComNet", "TrueComm", "OmniTech", "StyleHub", "BookWorld", "SportZone", "HomeEssentials", "GadgetPro"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderId(index: number): string {
  return `OD${Date.now().toString().slice(-8)}${String(index).padStart(4, '0')}`;
}

function generateTrackingNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 3; i++) result += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 10; i++) result += Math.floor(Math.random() * 10);
  return result;
}

function generatePhone(): string {
  return `+91 ${randomNumber(70000, 99999)}${randomNumber(10000, 99999)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNumber(1, 999)}@${randomElement(domains)}`;
}

function generatePincode(): string {
  return String(randomNumber(100001, 999999));
}

function getRandomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomNumber(0, daysAgo));
  date.setHours(randomNumber(0, 23), randomNumber(0, 59), 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateOrder(index: number) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const cityIndex = randomNumber(0, cities.length - 1);
  const categoryData = randomElement(productCategories);
  const subcategory = randomElement(categoryData.subcategories);
  const brand = randomElement(categoryData.brands);
  const productName = randomElement(productNames[subcategory] || ["Generic Product"]);
  
  const basePrice = randomNumber(299, 99999);
  const quantity = randomNumber(1, 3);
  const discountPercent = randomNumber(0, 30);
  const discountAmount = Math.round(basePrice * quantity * discountPercent / 100);
  const taxAmount = Math.round((basePrice * quantity - discountAmount) * 0.18);
  const shippingFee = basePrice > 499 ? 0 : randomNumber(40, 99);
  const totalAmount = basePrice * quantity - discountAmount + taxAmount + shippingFee;
  
  const orderDate = getRandomDate(90);
  const status = randomElement(orderStatuses);
  
  // Generate status-appropriate dates
  let confirmedDate = null, packedDate = null, shippedDate = null, expectedDelivery = null, actualDelivery = null;
  const statusIndex = orderStatuses.indexOf(status);
  
  if (statusIndex >= 1) confirmedDate = addDays(orderDate, randomNumber(0, 1));
  if (statusIndex >= 2) packedDate = addDays(orderDate, randomNumber(1, 2));
  if (statusIndex >= 3) shippedDate = addDays(orderDate, randomNumber(2, 3));
  if (statusIndex >= 3) expectedDelivery = addDays(orderDate, randomNumber(5, 10));
  if (status === "Delivered") actualDelivery = addDays(orderDate, randomNumber(4, 8));
  
  const currentLocations: Record<string, string> = {
    "Order Placed": `Seller Warehouse, ${randomElement(cities)}`,
    "Confirmed": `Seller Warehouse, ${randomElement(cities)}`,
    "Packed": `Fulfillment Center, ${randomElement(cities)}`,
    "Shipped": `${randomElement(carriers)} Hub, ${randomElement(cities)}`,
    "In Transit": `${randomElement(carriers)} Sorting Facility, ${randomElement(cities)}`,
    "Out for Delivery": `Local Delivery Hub, ${cities[cityIndex]}`,
    "Delivered": `Delivered to ${cities[cityIndex]}`,
    "Cancelled": "Order Cancelled",
    "Returned": `Return Processing Center, ${randomElement(cities)}`
  };

  return {
    order_id: generateOrderId(index),
    customer_name: `${firstName} ${lastName}`,
    customer_email: generateEmail(firstName, lastName),
    customer_phone: generatePhone(),
    customer_address: `${randomNumber(1, 999)}, ${randomElement(["MG Road", "Anna Nagar", "Bandra West", "Koramangala", "Salt Lake", "Jubilee Hills", "Sector", "Phase"])} ${randomNumber(1, 20)}`,
    customer_city: cities[cityIndex],
    customer_state: states[cityIndex],
    customer_pincode: generatePincode(),
    customer_country: "India",
    product_id: `PRD${randomNumber(100000, 999999)}`,
    product_name: productName,
    product_category: categoryData.category,
    product_subcategory: subcategory,
    product_brand: brand,
    product_color: randomElement(colors),
    product_size: categoryData.category === "Fashion" ? randomElement(sizes) : null,
    product_price: basePrice,
    quantity,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    order_status: status,
    payment_method: randomElement(paymentMethods),
    payment_status: status === "Cancelled" ? "Refunded" : status === "Returned" ? "Refund Initiated" : "Completed",
    payment_id: `PAY${Date.now().toString().slice(-10)}${randomNumber(1000, 9999)}`,
    order_date: orderDate.toISOString(),
    confirmed_date: confirmedDate?.toISOString() || null,
    packed_date: packedDate?.toISOString() || null,
    shipped_date: shippedDate?.toISOString() || null,
    expected_delivery: expectedDelivery?.toISOString() || null,
    actual_delivery: actualDelivery?.toISOString() || null,
    tracking_number: statusIndex >= 3 ? generateTrackingNumber() : null,
    carrier_name: statusIndex >= 3 ? randomElement(carriers) : null,
    current_location: currentLocations[status],
    seller_name: randomElement(sellers),
    seller_rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
    order_notes: Math.random() > 0.7 ? randomElement(["Handle with care", "Gift wrapped", "Leave at door", "Call before delivery", "Fragile item"]) : null,
    is_gift: Math.random() > 0.9,
    gift_message: Math.random() > 0.95 ? "Happy Birthday!" : null
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if orders already exist
    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
    
    if (count && count >= 100) {
      return new Response(
        JSON.stringify({ message: "Database already seeded with orders", count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 100 orders
    const orders = Array.from({ length: 100 }, (_, i) => generateOrder(i + 1));

    // Insert orders in batches
    const batchSize = 25;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const { error } = await supabase.from("orders").insert(batch);
      if (error) {
        console.error("Insert error:", error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ message: "Successfully seeded 100 orders", count: 100 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
