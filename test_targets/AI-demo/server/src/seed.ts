/**
 * סקריפט Seed - מילוי בסיס הנתונים בנתונים ראשוניים לבדיקות
 *
 * מריצים עם: npm run seed
 *
 * הסקריפט מוחק את כל הנתונים הקיימים ומכניס:
 * - 50 מוצרי אלקטרוניקה אמיתיים עם מחירים בשקלים
 * - 20 לקוחות עם שמות ישראליים
 * - 24 הזמנות מהיום + היסטוריית הזמנות לחודש האחרון (~45,000₪)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Customer from "./models/Customer";
import Product from "./models/Product";
import Order from "./models/Order";
import type { OrderStatus, UserRole } from "@architect/shared";

dotenv.config();

// ============================================================
// 📦 מוצרים - 50 מוצרי אלקטרוניקה אמיתיים
// ============================================================
const products = [
  // --- מצלמות ---
  { name: "Sony Alpha A7 IV", description: "מצלמת מירורלס Full Frame 33MP - גוף בלבד", price: 8999, category: "מצלמות", stock: 10, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400" },
  { name: "Canon EOS R6 Mark II", description: "מצלמת מירורלס Full Frame 24MP - ביצועי AF מתקדמים", price: 9499, category: "מצלמות", stock: 8, image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400" },
  { name: "Nikon Z6 III", description: "מצלמת מירורלס Full Frame 24MP - צילום וידאו 6K", price: 8499, category: "מצלמות", stock: 7, image: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=400" },
  { name: "Sony ZV-E10 II", description: "מצלמת וולוג קומפקטית - מושלמת ליוצרי תוכן", price: 3299, category: "מצלמות", stock: 20, image: "https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=400" },
  { name: "Fujifilm X-T5", description: "מצלמת מירורלס APS-C 40MP - עיצוב רטרו", price: 6799, category: "מצלמות", stock: 12, image: "https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=400" },
  { name: "GoPro HERO 12 Black", description: "מצלמת אקסטרים 5.3K עמידה במים", price: 1799, category: "מצלמות", stock: 30, image: "https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=400" },
  { name: "DJI Osmo Pocket 3", description: "מצלמת גימבל כיס - מסך OLED מסתובב", price: 2199, category: "מצלמות", stock: 15, image: "https://images.unsplash.com/photo-1593376893114-1aed528d80cf?w=400" },

  // --- מחשבים ניידים ---
  { name: "MacBook Pro M3 14\"", description: "מקבוק פרו M3 14 אינץ׳ 16GB RAM 512GB SSD", price: 7999, category: "מחשבים ניידים", stock: 12, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400" },
  { name: "MacBook Pro M3 Pro 16\"", description: "מקבוק פרו M3 Pro 16 אינץ׳ 36GB RAM 512GB SSD", price: 12499, category: "מחשבים ניידים", stock: 8, image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400" },
  { name: "MacBook Air M3 15\"", description: "מקבוק אייר M3 15 אינץ׳ 16GB RAM 256GB SSD", price: 5999, category: "מחשבים ניידים", stock: 20, image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400" },
  { name: "Dell XPS 15", description: "דל XPS 15 - Intel i7, 16GB RAM, 512GB SSD, OLED", price: 6499, category: "מחשבים ניידים", stock: 10, image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400" },
  { name: "Lenovo ThinkPad X1 Carbon", description: "לנובו ThinkPad X1 Carbon Gen 11 - i7, 16GB", price: 7299, category: "מחשבים ניידים", stock: 9, image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400" },
  { name: "ASUS ROG Zephyrus G14", description: "אסוס ROG Zephyrus G14 - Ryzen 9, RTX 4060, 16GB", price: 6999, category: "מחשבים ניידים", stock: 7, image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400" },
  { name: "HP Spectre x360 14", description: "HP Spectre x360 14 אינץ׳ - i7, 16GB, OLED מסך מגע", price: 5799, category: "מחשבים ניידים", stock: 11, image: "https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400" },

  // --- מקרנים ---
  { name: "Epson EH-TW7100", description: "מקרן ביתי 4K PRO-UHD עם 3000 לומן", price: 4999, category: "מקרנים", stock: 8, image: "https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=400" },
  { name: "Samsung The Freestyle 2", description: "מקרן נייד חכם Full HD - עד 100 אינץ׳", price: 2999, category: "מקרנים", stock: 14, image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400" },
  { name: "XGIMI Horizon Ultra", description: "מקרן 4K עם Dolby Vision ו-Harman Kardon", price: 6499, category: "מקרנים", stock: 6, image: "https://images.unsplash.com/photo-1585156292218-c4d872e498f0?w=400" },

  // --- גיימינג ---
  { name: "PlayStation 5 Slim", description: "קונסולת PS5 סלים עם כונן דיסקים - לבן", price: 2199, category: "גיימינג", stock: 25, image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400" },
  { name: "Nintendo Switch OLED", description: "קונסולה ניידת עם מסך OLED 7 אינץ׳ - לבן", price: 1499, category: "גיימינג", stock: 30, image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400" },

  // --- אוזניות ---
  { name: "Sony WH-1000XM5", description: "אוזניות אלחוטיות Over-Ear עם ביטול רעשים - שחור", price: 1399, category: "אוזניות", stock: 45, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400" },
  { name: "Apple AirPods Pro 2", description: "אוזניות אלחוטיות עם ביטול רעשים ו-USB-C", price: 999, category: "אוזניות", stock: 60, image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400" },
  { name: "Apple AirPods Max", description: "אוזניות Over-Ear פרימיום - כסוף", price: 2199, category: "אוזניות", stock: 15, image: "https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=400" },
  { name: "Bose QuietComfort Ultra", description: "אוזניות אלחוטיות עם ביטול רעשים אולטרה", price: 1599, category: "אוזניות", stock: 25, image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400" },
  { name: "Samsung Galaxy Buds3 Pro", description: "אוזניות In-Ear אלחוטיות עם ביטול רעשים", price: 799, category: "אוזניות", stock: 40, image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400" },
  { name: "JBL Tune 770NC", description: "אוזניות Over-Ear אלחוטיות עם ביטול רעשים", price: 349, category: "אוזניות", stock: 50, image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400" },

  // --- שעונים חכמים ---
  { name: "Apple Watch Ultra 2", description: "אפל ווטש אולטרה 2 - 49mm, טיטניום", price: 3599, category: "שעונים חכמים", stock: 18, image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400" },
  { name: "Apple Watch Series 9", description: "אפל ווטש סדרה 9 - 45mm, אלומיניום כחול", price: 1799, category: "שעונים חכמים", stock: 35, image: "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400" },
  { name: "Samsung Galaxy Watch 6 Classic", description: "שעון חכם סמסונג גלקסי ווטש 6 קלאסיק 47mm", price: 1499, category: "שעונים חכמים", stock: 20, image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400" },
  { name: "Garmin Fenix 7X Pro", description: "שעון ספורט חכם גרמין Fenix 7X Pro Solar", price: 2899, category: "שעונים חכמים", stock: 10, image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400" },

  // --- רמקולים ---
  { name: "JBL Charge 5", description: "רמקול בלוטות׳ נייד עמיד במים - שחור", price: 599, category: "רמקולים", stock: 55, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400" },
  { name: "Sonos Era 300", description: "רמקול חכם עם Dolby Atmos ו-WiFi", price: 1999, category: "רמקולים", stock: 14, image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400" },
  { name: "Marshall Stanmore III", description: "רמקול ביתי בלוטות׳ בעיצוב רטרו", price: 1699, category: "רמקולים", stock: 12, image: "https://images.unsplash.com/photo-1507646227500-4d389b0012be?w=400" },
  { name: "Bose SoundLink Max", description: "רמקול נייד עם סאונד עוצמתי - שחור", price: 899, category: "רמקולים", stock: 30, image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400" },
  { name: "JBL Flip 6", description: "רמקול נייד קומפקטי עמיד במים - אדום", price: 449, category: "רמקולים", stock: 65, image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=400" },
  { name: "Apple HomePod 2", description: "רמקול חכם של אפל עם Siri - לבן", price: 1299, category: "רמקולים", stock: 20, image: "https://images.unsplash.com/photo-1512446816042-444d641267d4?w=400" },

  // --- צגים ומסכים ---
  { name: "LG UltraFine 27\" 5K", description: "מסך 27 אינץ׳ 5K IPS - מושלם למקבוק", price: 4299, category: "צגים", stock: 8, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400" },
  { name: "Samsung Odyssey G9 49\"", description: "מסך גיימינג קעור 49 אינץ׳ DQHD 240Hz", price: 5499, category: "צגים", stock: 5, image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400" },
  { name: "Dell UltraSharp U2723QE", description: "מסך 27 אינץ׳ 4K IPS עם USB-C Hub", price: 2499, category: "צגים", stock: 15, image: "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=400" },
  { name: "Apple Studio Display", description: "מסך אפל סטודיו 27 אינץ׳ 5K", price: 6999, category: "צגים", stock: 6, image: "https://images.unsplash.com/photo-1616711906333-23cf8e024f0b?w=400" },
  { name: "ASUS ProArt PA278QV", description: "מסך מקצועי לעריכה 27 אינץ׳ QHD", price: 1599, category: "צגים", stock: 13, image: "https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=400" },

  // --- אביזרים ---
  { name: "Apple Magic Keyboard", description: "מקלדת אלחוטית עם Touch ID - שחור/כסוף", price: 699, category: "אביזרים", stock: 40, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400" },
  { name: "Logitech MX Master 3S", description: "עכבר אלחוטי ארגונומי פרימיום - אפור", price: 399, category: "אביזרים", stock: 50, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400" },
  { name: "Apple Magic Mouse", description: "עכבר אלחוטי אפל עם משטח Multi-Touch", price: 349, category: "אביזרים", stock: 35, image: "https://images.unsplash.com/photo-1615750185825-fc85b1e2c42b?w=400" },
  { name: "Samsung T7 Shield 2TB", description: "דיסק SSD חיצוני 2TB עמיד בזעזועים - שחור", price: 549, category: "אביזרים", stock: 28, image: "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?w=400" },
  { name: "Anker PowerCore 26800", description: "סוללה ניידת 26800mAh - טעינה מהירה", price: 249, category: "אביזרים", stock: 70, image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400" },
  { name: "Apple AirTag 4-Pack", description: "ארבע תגיות איתור חכמות של אפל", price: 449, category: "אביזרים", stock: 45, image: "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=400" },
  { name: "Logitech MX Keys Mini", description: "מקלדת אלחוטית קומפקטית מוארת", price: 449, category: "אביזרים", stock: 32, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400" },
  { name: "CalDigit TS4 Thunderbolt Hub", description: "תחנת עגינה Thunderbolt 4 עם 18 חיבורים", price: 1699, category: "אביזרים", stock: 10, image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400" },
  { name: "Wacom Intuos Pro M", description: "טאבלט ציור מקצועי בינוני - חיבור Bluetooth", price: 1499, category: "אביזרים", stock: 16, image: "https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=400" },
  { name: "Razer DeathAdder V3 Pro", description: "עכבר גיימינג אלחוטי מקצועי - שחור", price: 599, category: "אביזרים", stock: 22, image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400" },
];

// ============================================================
// 👥 לקוחות - 20 לקוחות עם שמות ישראליים
// ============================================================
const customers = [
  { name: "יוסי כהן", email: "yossi.cohen@gmail.com", password: "hashed_password_1", phone: "050-1234567", address: "הרצל 15, תל אביב" },
  { name: "מיכל לוי", email: "michal.levi@gmail.com", password: "hashed_password_2", phone: "052-2345678", address: "רוטשילד 42, תל אביב" },
  { name: "אבי מזרחי", email: "avi.mizrahi@walla.co.il", password: "hashed_password_3", phone: "054-3456789", address: "ז׳בוטינסקי 8, רמת גן" },
  { name: "נועה פרידמן", email: "noa.friedman@gmail.com", password: "hashed_password_4", phone: "050-4567890", address: "בן גוריון 23, הרצליה" },
  { name: "דני ביטון", email: "dani.biton@yahoo.com", password: "hashed_password_5", phone: "053-5678901", address: "אלנבי 99, תל אביב" },
  { name: "שירה אברהם", email: "shira.avraham@gmail.com", password: "hashed_password_6", phone: "058-6789012", address: "הנשיא 12, ירושלים" },
  { name: "עומר גולן", email: "omer.golan@outlook.com", password: "hashed_password_7", phone: "052-7890123", address: "סוקולוב 5, רעננה" },
  { name: "תמר שלום", email: "tamar.shalom@gmail.com", password: "hashed_password_8", phone: "054-8901234", address: "ויצמן 30, כפר סבא" },
  { name: "איתי רוזנברג", email: "itay.rosenberg@gmail.com", password: "hashed_password_9", phone: "050-9012345", address: "דרך העצמאות 18, חיפה" },
  { name: "ליאת חדד", email: "liat.hadad@walla.co.il", password: "hashed_password_10", phone: "053-0123456", address: "הרב קוק 7, באר שבע" },
  { name: "רון דוד", email: "ron.david@gmail.com", password: "hashed_password_11", phone: "052-1111222", address: "אבן גבירול 50, תל אביב" },
  { name: "הדס ישראלי", email: "hadas.israeli@gmail.com", password: "hashed_password_12", phone: "054-2222333", address: "ארלוזורוב 67, תל אביב" },
  { name: "אלעד פרץ", email: "elad.peretz@yahoo.com", password: "hashed_password_13", phone: "050-3333444", address: "הגפן 3, רחובות" },
  { name: "מאיה אשכנזי", email: "maya.ashkenazi@gmail.com", password: "hashed_password_14", phone: "058-4444555", address: "המלך ג׳ורג׳ 22, ירושלים" },
  { name: "יונתן ברק", email: "yonatan.barak@gmail.com", password: "hashed_password_15", phone: "052-5555666", address: "נורדאו 14, נתניה" },
  { name: "רותם סגל", email: "rotem.segal@outlook.com", password: "hashed_password_16", phone: "054-6666777", address: "דיזנגוף 120, תל אביב" },
  { name: "עידו נחמיאס", email: "ido.nachmias@gmail.com", password: "hashed_password_17", phone: "050-7777888", address: "בלפור 9, בת ים" },
  { name: "ליהי מלכה", email: "lihi.malka@walla.co.il", password: "hashed_password_18", phone: "053-8888999", address: "התמר 6, אילת" },
  { name: "גיא שפירא", email: "guy.shapira@gmail.com", password: "hashed_password_19", phone: "058-9999000", address: "הברוש 11, מודיעין" },
  { name: "נועם אלון", email: "noam.alon@gmail.com", password: "hashed_password_20", phone: "052-0000111", address: "הגליל 28, עפולה" },
];

// ============================================================
// 🛒 יצירת הזמנות
// ============================================================

/**
 * פונקציית עזר - מחזירה תאריך אקראי בטווח של X ימים אחרונים
 */
function randomDateInRange(daysBack: number, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

/**
 * פונקציית עזר - מחזירה תאריך היום עם שעה אקראית
 */
function randomTimeToday(): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // שעה אקראית בין 00:00 לשעה הנוכחית
  const currentHour = now.getHours();
  date.setHours(Math.floor(Math.random() * (currentHour + 1)), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

/**
 * פונקציית עזר - בחירה אקראית מתוך מערך
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * פונקציית עזר - בחירת מספר אקראי של פריטים מתוך מערך
 */
function pickRandomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ============================================================
// 🚀 פונקציית ה-Seed הראשית
// ============================================================
async function seed() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/techstore";

  console.log("🔌 מתחבר ל-MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ מחובר!");

  // מחיקת כל הנתונים הקיימים
  console.log("🗑️  מוחק נתונים קיימים...");
  await Promise.all([
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);

  // הכנסת מוצרים
  console.log("📦 מכניס 50 מוצרים...");
  const insertedProducts = await Product.insertMany(products);
  console.log(`   ✅ ${insertedProducts.length} מוצרים נוספו`);

  // הכנסת לקוחות (עם תאריכי יצירה מגוונים)
  console.log("👥 מכניס משתמשי backoffice + 20 לקוחות...");

  // ⚠️ Customer.insertMany לא מפעיל pre('save'), לכן נצפין סיסמאות מראש בעצמנו.
  // סיסמת dev אחידה לכל המשתמשים: Admin1234 (תואם ל-MOCK_USER הישן בלקוח)
  const DEV_PASSWORD = "Admin1234";
  const hashedDevPassword = await bcrypt.hash(DEV_PASSWORD, 12);

  // משתמשי backoffice ידועים מראש - לפיתוח ו-RBAC testing
  const backofficeUsers: Array<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }> = [
    { name: "Admin TechStore", email: "admin@techstore.com", password: hashedDevPassword, role: "admin" },
    { name: "Manager TechStore", email: "manager@techstore.com", password: hashedDevPassword, role: "manager" },
  ];

  const customersWithDates = customers.map((c, i) => ({
    ...c,
    password: hashedDevPassword, // דורסים את ה-"hashed_password_X" המקורי בסיסמה אמיתית
    role: "user" as UserRole,
    createdAt: new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000), // פריסה על פני 60 יום
  }));

  const insertedCustomers = await Customer.insertMany([
    ...backofficeUsers,
    ...customersWithDates,
  ]);
  console.log(`   ✅ ${insertedCustomers.length} משתמשים נוספו (כולל admin + manager)`);
  console.log(`   🔑 סיסמת ברירת מחדל לכל המשתמשים: ${DEV_PASSWORD}`);

  // ============================================================
  // 📋 יצירת הזמנות - "הסיפור"
  // ============================================================
  const allOrders: {
    customer: mongoose.Types.ObjectId;
    items: mongoose.Types.ObjectId[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  const productIds = insertedProducts.map((p) => p._id as mongoose.Types.ObjectId);
  const customerIds = insertedCustomers.map((c) => c._id as mongoose.Types.ObjectId);

  // --- 24 הזמנות מהיום ---
  console.log("🛒 יוצר 24 הזמנות מהיום...");
  const todayStatuses: OrderStatus[] = [
    "pending", "pending", "pending", "pending", "pending",
    "paid", "paid", "paid", "paid", "paid", "paid", "paid",
    "shipped", "shipped", "shipped", "shipped",
    "cancelled", "cancelled", "cancelled",
    "returned", "returned",
    "paid", "pending", "shipped",
  ];

  let todayTotalForDisplay = 0;
  for (let i = 0; i < 24; i++) {
    const items = pickRandomItems(productIds, 1, 4);
    const total = items.reduce((sum, itemId) => {
      const product = insertedProducts.find((p) => (p._id as mongoose.Types.ObjectId).equals(itemId));
      return sum + (product?.price || 0);
    }, 0);
    const createdAt = randomTimeToday();
    const status = todayStatuses[i]!;

    allOrders.push({
      customer: pickRandom(customerIds),
      items,
      totalAmount: total,
      status,
      createdAt,
      updatedAt: createdAt,
    });

    todayTotalForDisplay += total;
  }
  console.log(`   📊 סה״כ הזמנות היום: ${todayTotalForDisplay.toLocaleString()}₪`);

  // --- הזמנות היסטוריות לחודש האחרון ---
  // המטרה: סך כל ההזמנות של החודש (כולל היום) ~45,000₪
  // אז צריכים בערך 45,000 - todayTotal מהזמנות היסטוריות
  console.log("📅 יוצר הזמנות היסטוריות לחודש האחרון...");

  const targetMonthlyTotal = 45000;
  let historicalTotal = 0;
  const historicalTarget = targetMonthlyTotal - todayTotalForDisplay;

  // סטטוסים מגוונים להזמנות היסטוריות
  const historicalStatuses: OrderStatus[] = [
    "paid", "paid", "paid", "paid", "paid",
    "shipped", "shipped", "shipped", "shipped",
    "cancelled", "cancelled",
    "returned",
    "pending",
  ];

  let orderCount = 0;

  // ממשיכים ליצור הזמנות עד שמגיעים ליעד
  while (historicalTotal < historicalTarget) {
    const items = pickRandomItems(productIds, 1, 3);
    let total = items.reduce((sum, itemId) => {
      const product = insertedProducts.find((p) => (p._id as mongoose.Types.ObjectId).equals(itemId));
      return sum + (product?.price || 0);
    }, 0);

    // אם הסכום הזה יעבור את היעד, נצמצם אותו
    if (historicalTotal + total > historicalTarget + 2000) {
      // נבחר רק מוצר אחד זול
      const cheapProduct = insertedProducts
        .filter((p) => p.price <= (historicalTarget - historicalTotal + 500))
        .sort(() => 0.5 - Math.random())[0];

      if (!cheapProduct || historicalTarget - historicalTotal < 200) break;

      total = cheapProduct.price;
      const createdAt = randomDateInRange(29); // 1-29 ימים אחורה
      allOrders.push({
        customer: pickRandom(customerIds),
        items: [cheapProduct._id as mongoose.Types.ObjectId],
        totalAmount: total,
        status: pickRandom(historicalStatuses),
        createdAt,
        updatedAt: createdAt,
      });
    } else {
      const createdAt = randomDateInRange(29); // 1-29 ימים אחורה (לא כולל היום)
      allOrders.push({
        customer: pickRandom(customerIds),
        items,
        totalAmount: total,
        status: pickRandom(historicalStatuses),
        createdAt,
        updatedAt: createdAt,
      });
    }

    historicalTotal += total;
    orderCount++;
  }

  console.log(`   📊 ${orderCount} הזמנות היסטוריות נוצרו, סה״כ: ${historicalTotal.toLocaleString()}₪`);
  console.log(`   📊 סה״כ כל ההזמנות בחודש: ${(todayTotalForDisplay + historicalTotal).toLocaleString()}₪`);

  // הכנסת כל ההזמנות לDB
  console.log("💾 שומר הזמנות ל-MongoDB...");
  const insertedOrders = await Order.insertMany(allOrders);
  console.log(`   ✅ ${insertedOrders.length} הזמנות נוספו`);

  // --- סיכום ---
  console.log("\n========================================");
  console.log("🎉 ה-Seed הושלם בהצלחה!");
  console.log("========================================");
  console.log(`📦 מוצרים: ${insertedProducts.length}`);
  console.log(`👥 לקוחות: ${insertedCustomers.length}`);
  console.log(`🛒 הזמנות: ${insertedOrders.length}`);
  console.log(`   - מהיום: 24`);
  console.log(`   - היסטוריות: ${orderCount}`);

  // סטטיסטיקות סטטוס
  const statusCounts: Record<string, number> = {};
  for (const order of allOrders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  }
  console.log("📊 פילוח לפי סטטוס:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`   - ${status}: ${count}`);
  }
  console.log(`💰 סה״כ מחזור חודשי: ~${(todayTotalForDisplay + historicalTotal).toLocaleString()}₪`);
  console.log("========================================\n");

  await mongoose.disconnect();
  console.log("🔌 התנתק מ-MongoDB. להתראות!");
}

// הרצת הסקריפט
seed().catch((err) => {
  console.error("❌ שגיאה בהרצת ה-Seed:", err);
  mongoose.disconnect();
  process.exit(1);
});
