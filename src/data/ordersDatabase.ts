// Flipkart-style order database with 100 rows and 40 columns

export interface Order {
  order_id: string;
  customer_id: string;
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
  product_color: string;
  product_size: string;
  product_weight: string;
  product_price: number;
  product_discount: number;
  quantity: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_date: string;
  order_time: string;
  shipped_date: string;
  expected_delivery: string;
  actual_delivery: string;
  order_status: string;
  tracking_number: string;
  carrier_name: string;
  current_location: string;
  last_update: string;
  warehouse_id: string;
  seller_id: string;
  seller_name: string;
  return_eligible: boolean;
  gift_wrap: boolean;
  special_instructions: string;
}

const firstNames = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Rohit", "Kavita", "Arjun", "Neha", "Sanjay", "Meera", "Karthik", "Divya", "Arun", "Pooja", "Ravi", "Lakshmi", "Suresh", "Geeta"];
const lastNames = ["Sharma", "Patel", "Singh", "Kumar", "Reddy", "Gupta", "Verma", "Iyer", "Nair", "Joshi", "Rao", "Mehta", "Shah", "Das", "Chopra", "Malhotra", "Kapoor", "Bhatia", "Menon", "Pillai"];

const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kochi", "Chandigarh", "Indore", "Coimbatore", "Nagpur"];
const states = ["Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh", "Kerala", "Punjab", "Madhya Pradesh", "Andhra Pradesh", "Goa", "Haryana"];

const categories = ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports", "Books", "Toys", "Grocery", "Automotive", "Health"];
const subcategories = {
  "Electronics": ["Smartphones", "Laptops", "Headphones", "Tablets", "Cameras", "Smartwatches"],
  "Fashion": ["Men's Clothing", "Women's Clothing", "Footwear", "Accessories", "Watches", "Bags"],
  "Home & Kitchen": ["Furniture", "Kitchen Appliances", "Home Decor", "Bedding", "Storage", "Lighting"],
  "Beauty": ["Skincare", "Makeup", "Haircare", "Fragrances", "Personal Care", "Grooming"],
  "Sports": ["Fitness Equipment", "Sports Wear", "Outdoor Gear", "Cycling", "Swimming", "Yoga"],
  "Books": ["Fiction", "Non-Fiction", "Educational", "Comics", "Self-Help", "Biography"],
  "Toys": ["Action Figures", "Board Games", "Educational Toys", "Dolls", "Remote Control", "Building Blocks"],
  "Grocery": ["Snacks", "Beverages", "Staples", "Dairy", "Organic", "Gourmet"],
  "Automotive": ["Car Accessories", "Bike Accessories", "Maintenance", "Electronics", "Tools", "Safety"],
  "Health": ["Vitamins", "Supplements", "Medical Devices", "First Aid", "Wellness", "Ayurvedic"]
};

const brands = ["Samsung", "Apple", "Nike", "Adidas", "Sony", "LG", "Boat", "Puma", "HP", "Dell", "Lenovo", "Xiaomi", "OnePlus", "Philips", "Prestige", "Bajaj", "Titan", "Fastrack", "Wildcraft", "Decathlon"];
const colors = ["Black", "White", "Blue", "Red", "Green", "Silver", "Gold", "Rose Gold", "Navy", "Grey", "Beige", "Brown", "Purple", "Orange", "Pink"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40", "42"];
const carriers = ["Delhivery", "Blue Dart", "Ekart", "DTDC", "Xpressbees", "Ecom Express", "Shadowfax", "Dunzo"];

const orderStatuses = ["Order Placed", "Confirmed", "Packed", "Shipped", "In Transit", "Out for Delivery", "Delivered", "Cancelled", "Returned"];
const paymentMethods = ["UPI", "Credit Card", "Debit Card", "Net Banking", "Cash on Delivery", "Wallet", "EMI"];
const paymentStatuses = ["Paid", "Pending", "Failed", "Refunded", "COD"];

const warehouses = ["WH-MUM-01", "WH-DEL-02", "WH-BLR-03", "WH-HYD-04", "WH-CHN-05", "WH-KOL-06", "WH-PUN-07", "WH-AHM-08"];

const products: { [key: string]: string[] } = {
  "Smartphones": ["iPhone 15 Pro", "Samsung Galaxy S24", "OnePlus 12", "Pixel 8 Pro", "Xiaomi 14"],
  "Laptops": ["MacBook Pro 16", "Dell XPS 15", "HP Spectre x360", "Lenovo ThinkPad X1", "ASUS ROG Strix"],
  "Headphones": ["AirPods Pro", "Sony WH-1000XM5", "Boat Rockerz 550", "JBL Live 660NC", "Sennheiser HD 450BT"],
  "Men's Clothing": ["Cotton Casual Shirt", "Slim Fit Jeans", "Polo T-Shirt", "Formal Blazer", "Chino Pants"],
  "Women's Clothing": ["Floral Maxi Dress", "Denim Jacket", "Cotton Kurti", "Palazzo Pants", "Silk Saree"],
  "Kitchen Appliances": ["Mixer Grinder", "Induction Cooktop", "Microwave Oven", "Air Fryer", "Electric Kettle"],
  "Fitness Equipment": ["Yoga Mat", "Dumbbells Set", "Resistance Bands", "Treadmill", "Exercise Bike"],
  "default": ["Premium Product", "Essential Item", "Bestseller Product", "Top Rated Item", "Popular Choice"]
};

const locations = [
  "Mumbai Sorting Facility", "Delhi Hub", "Bangalore Distribution Center", 
  "Chennai Transit Point", "Hyderabad Warehouse", "Kolkata Sorting Center",
  "Pune Local Hub", "Ahmedabad Transit", "Out for Delivery - Local Area",
  "In Transit - Highway", "Reached Destination City", "At Doorstep"
];

const specialInstructions = [
  "Leave at door if not available",
  "Call before delivery",
  "Fragile - Handle with care",
  "Do not bend",
  "Ring doorbell twice",
  "Contact security desk",
  "Leave with neighbor",
  "Weekend delivery preferred",
  "Morning delivery only",
  ""
];

function generateRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0].substring(0, 5);
}

function generateTrackingNumber(): string {
  const prefix = ['FKT', 'DEL', 'EKT', 'XPB'][Math.floor(Math.random() * 4)];
  const number = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `${prefix}${number}`;
}

function generateOrderId(): string {
  return `OD${Date.now().toString().substring(5)}${Math.floor(Math.random() * 10000)}`;
}

function generateCustomerId(): string {
  return `CUS${Math.floor(Math.random() * 900000 + 100000)}`;
}

function generateProductId(): string {
  return `SKU${Math.floor(Math.random() * 9000000 + 1000000)}`;
}

function generatePhone(): string {
  return `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
}

function generateEmail(name: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  return `${name.toLowerCase().replace(' ', '.')}${Math.floor(Math.random() * 100)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

function generatePincode(): string {
  return String(Math.floor(Math.random() * 500000 + 100000));
}

export function generateOrders(count: number = 100): Order[] {
  const orders: Order[] = [];
  const today = new Date();
  const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const customerName = `${firstName} ${lastName}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subcategoryList = subcategories[category as keyof typeof subcategories];
    const subcategory = subcategoryList[Math.floor(Math.random() * subcategoryList.length)];
    
    const productList = products[subcategory] || products["default"];
    const productName = productList[Math.floor(Math.random() * productList.length)];
    
    const orderDate = generateRandomDate(threeMonthsAgo, today);
    const shippedDate = new Date(orderDate.getTime() + (Math.random() * 2 + 1) * 24 * 60 * 60 * 1000);
    const expectedDelivery = new Date(shippedDate.getTime() + (Math.random() * 5 + 2) * 24 * 60 * 60 * 1000);
    
    const statusIndex = Math.floor(Math.random() * orderStatuses.length);
    const status = orderStatuses[statusIndex];
    
    const actualDelivery = status === "Delivered" 
      ? formatDate(new Date(expectedDelivery.getTime() + (Math.random() * 2 - 1) * 24 * 60 * 60 * 1000))
      : "";
    
    const price = Math.floor(Math.random() * 50000 + 500);
    const discount = Math.floor(Math.random() * 30);
    const quantity = Math.floor(Math.random() * 3 + 1);
    const totalAmount = Math.floor(price * quantity * (1 - discount / 100));

    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const paymentStatus = paymentMethod === "Cash on Delivery" ? "COD" : paymentStatuses[Math.floor(Math.random() * 3)];

    orders.push({
      order_id: generateOrderId(),
      customer_id: generateCustomerId(),
      customer_name: customerName,
      customer_email: generateEmail(customerName),
      customer_phone: generatePhone(),
      customer_address: `${Math.floor(Math.random() * 500 + 1)}, ${["Park Street", "MG Road", "Ring Road", "Main Street", "Gandhi Nagar", "Sector " + Math.floor(Math.random() * 50 + 1)][Math.floor(Math.random() * 6)]}`,
      customer_city: city,
      customer_state: state,
      customer_pincode: generatePincode(),
      customer_country: "India",
      product_id: generateProductId(),
      product_name: productName,
      product_category: category,
      product_subcategory: subcategory,
      product_brand: brands[Math.floor(Math.random() * brands.length)],
      product_color: colors[Math.floor(Math.random() * colors.length)],
      product_size: sizes[Math.floor(Math.random() * sizes.length)],
      product_weight: `${(Math.random() * 5 + 0.1).toFixed(2)} kg`,
      product_price: price,
      product_discount: discount,
      quantity: quantity,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      order_date: formatDate(orderDate),
      order_time: formatTime(orderDate),
      shipped_date: formatDate(shippedDate),
      expected_delivery: formatDate(expectedDelivery),
      actual_delivery: actualDelivery,
      order_status: status,
      tracking_number: generateTrackingNumber(),
      carrier_name: carriers[Math.floor(Math.random() * carriers.length)],
      current_location: locations[Math.min(statusIndex, locations.length - 1)],
      last_update: formatDate(new Date(orderDate.getTime() + Math.random() * (today.getTime() - orderDate.getTime()))),
      warehouse_id: warehouses[Math.floor(Math.random() * warehouses.length)],
      seller_id: `SEL${Math.floor(Math.random() * 9000 + 1000)}`,
      seller_name: `${brands[Math.floor(Math.random() * brands.length)]} Official Store`,
      return_eligible: Math.random() > 0.3,
      gift_wrap: Math.random() > 0.8,
      special_instructions: specialInstructions[Math.floor(Math.random() * specialInstructions.length)]
    });
  }

  return orders;
}

// Generate 100 orders and export
export const ordersDatabase: Order[] = generateOrders(100);

// Helper function to search orders
export function searchOrders(query: string): Order[] {
  const lowerQuery = query.toLowerCase();
  return ordersDatabase.filter(order => 
    order.order_id.toLowerCase().includes(lowerQuery) ||
    order.customer_name.toLowerCase().includes(lowerQuery) ||
    order.product_name.toLowerCase().includes(lowerQuery) ||
    order.tracking_number.toLowerCase().includes(lowerQuery) ||
    order.order_status.toLowerCase().includes(lowerQuery) ||
    order.customer_city.toLowerCase().includes(lowerQuery)
  );
}

// Get order by ID
export function getOrderById(orderId: string): Order | undefined {
  return ordersDatabase.find(order => 
    order.order_id.toLowerCase() === orderId.toLowerCase() ||
    order.tracking_number.toLowerCase() === orderId.toLowerCase()
  );
}

// Get orders by status
export function getOrdersByStatus(status: string): Order[] {
  return ordersDatabase.filter(order => 
    order.order_status.toLowerCase() === status.toLowerCase()
  );
}

// Get orders by customer name
export function getOrdersByCustomer(customerName: string): Order[] {
  return ordersDatabase.filter(order => 
    order.customer_name.toLowerCase().includes(customerName.toLowerCase())
  );
}

// Get order statistics
export function getOrderStats() {
  const stats = {
    total: ordersDatabase.length,
    delivered: ordersDatabase.filter(o => o.order_status === "Delivered").length,
    inTransit: ordersDatabase.filter(o => o.order_status === "In Transit").length,
    pending: ordersDatabase.filter(o => ["Order Placed", "Confirmed", "Packed"].includes(o.order_status)).length,
    cancelled: ordersDatabase.filter(o => o.order_status === "Cancelled").length,
    totalRevenue: ordersDatabase.reduce((sum, o) => sum + o.total_amount, 0),
    avgOrderValue: Math.floor(ordersDatabase.reduce((sum, o) => sum + o.total_amount, 0) / ordersDatabase.length)
  };
  return stats;
}
