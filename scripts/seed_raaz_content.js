import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Tag from "../models/tag.model.js";
import Author from "../models/author.model.js";
import Article from "../models/article.model.js";
import Setting from "../models/setting.model.js";
import AdPlacement from "../models/adPlacement.model.js";

async function seedRaaz() {
  try {
    await connectDB();
    console.log("Connected to MongoDB for RAAZ initialization.");

    // 1. Initial Site Settings
    const defaultSettings = [
      { key: "SITE_NAME", value: "RAAZ", type: "string", description: "Official Site Brand", category: "general" },
      { key: "SITE_TAGLINE", value: "ज्ञान का आसान समाधान", type: "string", description: "Official Brand Tagline", category: "general" },
      { key: "DEFAULT_LOCALE", value: "hi", type: "string", description: "Default Platform Language (hi/en)", category: "general" },
      { key: "ADSENSE_ENABLED", value: false, type: "boolean", description: "Global Google AdSense Switch", category: "features" },
      { key: "ADSENSE_PUBLISHER_ID", value: "", type: "string", description: "Google AdSense Publisher ID", category: "general" },
      { key: "ADS_TXT_CONTENT", value: "# Google AdSense ads.txt for RAAZ\n# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0", type: "string", description: "ads.txt file", category: "general" },
      { key: "CONTACT_EMAIL", value: "support@raaz.in", type: "string", description: "Contact email", category: "general" },
    ];

    for (const s of defaultSettings) {
      await Setting.findOneAndUpdate({ key: s.key }, s, { upsert: true });
    }
    console.log("✅ Site settings initialized.");

    // 2. Default Ad Placements
    const adSlots = [
      { key: "header", name: "Header Ad Banner", format: "horizontal" },
      { key: "article_top", name: "Article Top (Below Title)", format: "rectangle" },
      { key: "article_middle", name: "Article In-Feed (Mid Content)", format: "rectangle" },
      { key: "article_bottom", name: "Article Bottom (Above Author)", format: "horizontal" },
      { key: "sidebar", name: "Sidebar Desktop Sticky Ad", format: "vertical" },
      { key: "footer", name: "Footer Ad Banner", format: "horizontal" },
    ];

    for (const slot of adSlots) {
      const exists = await AdPlacement.findOne({ key: slot.key });
      if (!exists) {
        await AdPlacement.create({
          key: slot.key,
          name: slot.name,
          format: slot.format,
          isEnabled: false,
          slotId: "",
        });
      }
    }
    console.log("✅ Ad placements initialized.");

    // 3. Categories as specified in prompt
    const categoriesData = [
      {
        name: "Technology",
        nameHindi: "तकनीक",
        slug: "technology",
        description: "Latest technology updates, gadgets, and technical knowledge explained simply.",
        descriptionHindi: "नवीनतम तकनीक, गैजेट्स और तकनीकी जानकारी सरल हिंदी में।",
        order: 1,
        isNav: true,
      },
      {
        name: "Artificial Intelligence",
        nameHindi: "आर्टिफिशियल इंटेलिजेंस",
        slug: "ai",
        description: "Explore AI tools, ChatGPT prompts, Machine Learning, and how AI impacts daily life.",
        descriptionHindi: "एआई टूल्स, चैटजीपीटी, मशीन लर्निंग और रोजमर्रा की जिंदगी में एआई का उपयोग।",
        order: 2,
        isNav: true,
      },
      {
        name: "Mobile Tips & Troubleshooting",
        nameHindi: "मोबाइल टिप्स और समाधान",
        slug: "mobile",
        description: "Android & iPhone hacks, battery optimization, and troubleshooting step-by-step.",
        descriptionHindi: "एंड्रॉइड और आईफोन टिप्स, बैटरी लाइफ बढ़ाने के उपाय और समस्याओं का आसान हल।",
        order: 3,
        isNav: true,
      },
      {
        name: "Apps & Software",
        nameHindi: "ऐप्स और सॉफ्टवेयर",
        slug: "apps",
        description: "Best productivity apps, useful Windows/Mac tools, and software tutorials.",
        descriptionHindi: "सर्वश्रेष्ठ मोबाइल ऐप्स, उपयोगी कंप्यूटर सॉफ्टवेयर और उनके सही इस्तेमाल के तरीके।",
        order: 4,
        isNav: true,
      },
      {
        name: "Internet & Networking",
        nameHindi: "इंटरनेट और नेटवर्किंग",
        slug: "internet",
        description: "Wi-Fi speeds, DNS settings, broadband plans, and internet problem solving.",
        descriptionHindi: "वाई-फाई स्पीड, डीएनएस सेटिंग्स, ब्रॉडबैंड गाइड और इंटरनेट से जुड़े समाधान।",
        order: 5,
        isNav: true,
      },
      {
        name: "Computers & Laptops",
        nameHindi: "कंप्यूटर और लैपटॉप",
        slug: "computer",
        description: "PC hardware guide, Windows 11 optimization, maintenance, and laptop buying advice.",
        descriptionHindi: "कंप्यूटर हार्डवेयर, विंडोज 11 स्पीड ट्रिक्स, मेंटेनेंस और नया लैपटॉप चुनने की सही सलाह।",
        order: 6,
        isNav: true,
      },
      {
        name: "Digital Safety & Cyber Awareness",
        nameHindi: "डिजिटल सुरक्षा",
        slug: "digital-safety",
        description: "Protect yourself from online fraud, scams, UPI phishing, and secure your accounts.",
        descriptionHindi: "ऑनलाइन फ्रॉड, यूपीआई फ्रॉड और हैकिंग से बचाव की जरूरी सावधानियां।",
        order: 7,
        isNav: true,
      },
      {
        name: "Practical How-to Guides",
        nameHindi: "उपयोगी गाइड",
        slug: "how-to",
        description: "Step-by-step practical guides for online tools, government portals, and tech setups.",
        descriptionHindi: "ऑनलाइन सर्विसेज, सरकारी पोर्टल्स और डिजिटल टूल्स के लिए स्टेप-बाय-स्टेप गाइड।",
        order: 8,
        isNav: true,
      },
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      let doc = await Category.findOne({ slug: cat.slug });
      if (!doc) {
        doc = await Category.create(cat);
      }
      categoryMap[cat.slug] = doc._id;
    }
    console.log("✅ Core categories created/verified.");

    // 4. Default Author
    let authorDoc = await Author.findOne({ slug: "raaz-editorial-team" });
    if (!authorDoc) {
      authorDoc = await Author.create({
        name: "RAAZ Editorial Team",
        nameHindi: "राज संपादकीय टीम",
        slug: "raaz-editorial-team",
        bio: "Dedicated to simplifying technology and digital awareness for every Indian.",
        bioHindi: "हर भारतीय के लिए तकनीक और डिजिटल जागरूकता को आसान बनाने के लिए समर्पित।",
        profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        email: "editorial@raaz.in",
      });
    }
    console.log("✅ Author verified.");

    // 5. Default Super Admin check
    let superAdmin = await User.findOne({ role: "super_admin" });
    if (!superAdmin) {
      superAdmin = new User({
        fullName: "RAAZ Platform Administrator",
        username: "raazadmin",
        phone: "+919876543210",
        password: process.env.SUPERADMIN_PASSWORD || "RaazAdmin@2026",
        role: "super_admin",
        isPrimarySuperAdmin: true,
        bio: "Chief Administrator of RAAZ Knowledge Platform.",
      });
      await superAdmin.save();
      console.log("✅ Super Admin created: @raazadmin");
    }

    // 6. Quality Starter Content (Bilingual Articles in Hindi & English)
    const articles = [
      {
        title: "2026 में अपने स्मार्टफोन की बैटरी लाइफ दोगुनी कैसे करें: 7 असरदार तरीके",
        slug: "how-to-double-smartphone-battery-life-tips",
        locale: "hi",
        excerpt: "क्या आपके फोन की बैटरी दोपहर होते-होते खत्म हो जाती है? जानिए वे 7 वैज्ञानिक और व्यावहारिक तरीके जिनसे आपके एंड्रॉइड या आईफोन की बैटरी पूरे दिन टिकेगी।",
        content: `
<h2>स्मार्टफोन बैटरी जल्दी क्यों खत्म होती है?</h2>
<p>आज के आधुनिक 5G स्मार्टफोन्स में हाई रिफ्रेश रेट डिस्प्ले (120Hz), बैकग्राउंड 5G सर्चिंग और लगातार चलने वाले ऐप्स बैटरी को तेजी से खत्म करते हैं। लिथियम-आयन बैटरी की उम्र और दैनिक बैकअप बढ़ाने के लिए नीचे दिए गए 7 सुझाव बेहद उपयोगी हैं।</p>

<h3>1. 5G नेटवर्क मोड को 'Auto' या जरूरत न होने पर 4G पर सेट करें</h3>
<p>5G नेटवर्क लगातार मजबूत सिग्नल ढूंढने के लिए अधिक पावर इस्तेमाल करता है। यदि आपके क्षेत्र में 5G नेटवर्क कमजोर है, तो फोन की सेटिंग्स में जाकर <strong>5G Auto / Smart 5G</strong> चुनें।</p>

<h3>2. 80-20 चार्जिंग नियम अपनाएं</h3>
<p>लिथियम-आयन बैटरी को 0% तक कभी खाली न होने दें और 100% तक हमेशा चार्ज करने से बचें। बैटरी को 20% पर चार्जिंग पर लगाएं और 80% से 85% के बीच निकाल लें। इससे बैटरी की लाइफ साइकिल 3 साल से ज्यादा चलती है।</p>

<h3>3. बैकग्राउंड ऐप रिफ्रेश बंद करें</h3>
<p>सोशल मीडिया और शॉपिंग ऐप्स बिना इस्तेमाल किए भी बैकग्राउंड में डेटा सिंक करते हैं। फोन सेटिंग्स > बैटरी > बैकग्राउंड एक्टिविटी में जाकर गैर-जरूरी ऐप्स का बैकग्राउंड डेटा रोकें।</p>

<h3>4. डार्क मोड और ऑटो-ब्राइटनेस का इस्तेमाल करें</h3>
<p>यदि आपके फोन में AMOLED या OLED स्क्रीन है, तो डार्क मोड ऑन करने से ब्लैक पिक्सल पूरी तरह बंद हो जाते हैं, जिससे स्क्रीन 30% से 40% कम पावर खर्च करती है।</p>

<h3>5. लोकेशन और ब्लूटूथ जब जरूरत हो तभी ऑन रखें</h3>
<p>कई ऐप्स हमेशा बैकग्राउंड में जीपीएस लोकेशन ट्रैक करते रहते हैं। लोकेशन परमिशन में 'While using the app' का चयन करें।</p>

<h2>निष्कर्ष</h2>
<p>इन आसान सेटिंग्स को करने के बाद आपके फोन का स्क्रीन-ऑन-टाइम (SOT) कम से कम 2 से 3 घंटे बढ़ जाएगा।</p>
        `,
        coverImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&auto=format&fit=crop&q=80",
        coverImageAlt: "स्मार्टफोन बैटरी चार्जिंग टिप्स",
        category: categoryMap["mobile"],
        author: authorDoc._id,
        status: "published",
        isFeatured: true,
        isTrending: true,
        readingTimeMinutes: 4,
        publishedAt: new Date(),
        translationGroupId: "grp_battery_guide_2026",
        seo: {
          metaTitle: "स्मार्टफोन की बैटरी लाइफ कैसे बढ़ाएं? 7 आसान तरीके - RAAZ",
          metaDescription: "एंड्रॉइड और आईफोन की बैटरी लाइफ बढ़ाने के 7 प्रैक्टिकल तरीके। 80-20 चार्जिंग रूल और बैटरी सेटिंग्स गाइड सरल हिंदी में।",
        },
      },
      {
        title: "How to Double Your Smartphone Battery Life in 2026: 7 Tested Tips",
        slug: "how-to-double-smartphone-battery-life-tips",
        locale: "en",
        excerpt: "Does your phone battery drain before evening? Discover 7 practical and battery-health preserving tips to make your Android or iPhone last all day.",
        content: `
<h2>Why Modern Phone Batteries Drain So Fast</h2>
<p>With high refresh rate 120Hz displays, continuous background 5G connectivity, and power-hungry apps, smartphones today require smart power management. Here are 7 proven habits to double your daily screen-on time and extend battery lifespan.</p>

<h3>1. Switch to 5G Auto or 4G LTE When Signal is Weak</h3>
<p>Poor 5G connectivity forces the cellular modem to broadcast at maximum wattage, drastically draining power. In your network settings, toggle <strong>Smart 5G</strong> or restrict to LTE in areas with fluctuating reception.</p>

<h3>2. Follow the 80-20 Charging Rule</h3>
<p>Lithium-ion batteries experience mechanical stress at extremes (below 20% and above 80%). Unplugging around 80-85% can more than double the long-term health of your device.</p>

<h3>3. Restrict Background Activity for Social Media Apps</h3>
<p>Apps like Instagram, Facebook, and shopping platforms frequently wake the CPU. Go to App Settings and set unused apps to Deep Sleep or Restricted Background execution.</p>

<h3>4. Leverage System-Wide Dark Mode on OLED Screens</h3>
<p>On OLED and AMOLED panels, true black pixels consume zero power. Activating system dark mode can save up to 35% battery across the day.</p>

<h3>5. Review Always-On Location Permissions</h3>
<p>Grant location permissions only 'While Using App' rather than 'Allow All The Time'.</p>

<h2>Conclusion</h2>
<p>Implementing these simple configurations will instantly give you 2 to 3 extra hours of daily usage without compromising functionality.</p>
        `,
        coverImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&auto=format&fit=crop&q=80",
        coverImageAlt: "Smartphone battery life optimization guide",
        category: categoryMap["mobile"],
        author: authorDoc._id,
        status: "published",
        isFeatured: true,
        isTrending: true,
        readingTimeMinutes: 4,
        publishedAt: new Date(),
        translationGroupId: "grp_battery_guide_2026",
        seo: {
          metaTitle: "How to Increase Smartphone Battery Life: 7 Proven Tips - RAAZ",
          metaDescription: "Step-by-step practical guide to optimizing battery life on Android and iPhone devices with the 80-20 rule and smart connectivity settings.",
        },
      },
      {
        title: "UPI फ्रॉड और ऑनलाइन घोटालों से बचने के 5 सुनहरे नियम",
        slug: "5-golden-rules-to-avoid-upi-fraud-and-online-scams",
        locale: "hi",
        excerpt: "डिजिटल भारत में UPI पेमेंट्स जितनी आसान हैं, धोखेबाज उतने ही शातिर हो चुके हैं। जानिए 5 जरूरी नियम जो आपके बैंक खाते को पूरी तरह सुरक्षित रखेंगे।",
        content: `
<h2>डिजिटल फ्रॉड से सावधान रहें</h2>
<p>आजकल फर्जी लॉटरी, बिजली बिल कटने के एसएमएस, क्यूआर कोड भेजकर पैसे मंगाने का झांसा देकर लोगों से ठगी की जा रही है। साइबर सुरक्षा विशेषज्ञों के अनुसार इन 5 नियमों का पालन करके आप 100% सुरक्षित रह सकते हैं।</p>

<h3>नियम 1: पैसे प्राप्त करने के लिए कभी भी UPI PIN दर्ज न करें</h3>
<p>हमेशा याद रखें: <strong>पैसे प्राप्त करने (Receive) के लिए केवल खाता नंबर या UPI ID की जरूरत होती है, PIN की नहीं।</strong> यदि कोई आपसे कहे कि 'PIN डालो और पैसे तुम्हारे खाते में आ जाएंगे', तो वह 100% धोखेबाज है।</p>

<h3>नियम 2: अनजान QR कोड कभी स्कैन न करें</h3>
<p>मार्केटप्लेस (जैसे OLX) पर सामान बेचते समय धोखेबाज 'एडवांस पेमेंट' के नाम पर QR कोड भेजते हैं। QR कोड स्कैन करते ही आपके खाते से पैसे कट जाते हैं।</p>

<h3>नियम 3: कभी भी AnyDesk या TeamViewer ऐप डाउनलोड न करें</h3>
<p>बैंक का फर्जी कस्टमर केयर बनकर धोखेबाज स्क्रीन शेयरिंग ऐप डाउनलोड करवाते हैं और आपकी बैंक स्क्रीन देखकर OTP चुरा लेते हैं। बैंक कभी स्क्रीन शेयर करने को नहीं कहता।</p>

<h3>नियम 4: साइबर हेल्पलाइन 1930 याद रखें</h3>
<p>यदि किसी धोखे से पैसे कट जाएं, तो तुरंत <strong>1930</strong> राष्ट्रीय साइबर हेल्पलाइन पर कॉल करें या <a href="https://cybercrime.gov.in" target="_blank" rel="noopener">cybercrime.gov.in</a> पर शिकायत दर्ज करें। शुरुआती 2 से 3 घंटों में शिकायत करने पर पैसे फ्रीज कराए जा सकते हैं।</p>
        `,
        coverImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
        coverImageAlt: "साइबर सुरक्षा और UPI सुरक्षा नियम",
        category: categoryMap["digital-safety"],
        author: authorDoc._id,
        status: "published",
        isFeatured: false,
        isTrending: true,
        readingTimeMinutes: 3,
        publishedAt: new Date(),
        translationGroupId: "grp_upi_safety_guide",
        seo: {
          metaTitle: "UPI फ्रॉड से कैसे बचें? 5 जरूरी साइबर सुरक्षा नियम - RAAZ",
          metaDescription: "ऑनलाइन और यूपीआई फ्रॉड से बचने के 5 सुनहरे नियम। 1930 साइबर हेल्पलाइन और सुरक्षित डिजिटल बैंकिंग की पूरी जानकारी।",
        },
      },
      {
        title: "5 Golden Rules to Protect Yourself from UPI and Online Payment Frauds",
        slug: "5-golden-rules-to-avoid-upi-fraud-and-online-scams",
        locale: "en",
        excerpt: "While UPI payments make digital transactions instantaneous, cyber scammers are getting more deceptive. Master these 5 essential safety rules to keep your bank accounts safe.",
        content: `
<h2>The Reality of Digital Financial Frauds</h2>
<p>From fake electric bill disconnection SMS alerts to deceptive marketplace QR codes, digital banking scams are rising. Following these 5 essential rules guarantees your personal safety.</p>

<h3>Rule 1: Never Enter Your UPI PIN to Receive Money</h3>
<p>Remember this fundamental rule: <strong>UPI PIN is only required to SEND money, never to RECEIVE money.</strong> Anyone telling you to enter your PIN to claim a refund or payment is trying to defraud you.</p>

<h3>Rule 2: Never Scan Unverified QR Codes</h3>
<p>Scammers on peer-to-peer marketplaces often share QR codes claiming they represent an advance deposit. Scanning a QR code authorizes a debit, not a credit.</p>

<h3>Rule 3: Beware of Remote Desktop Apps (AnyDesk, QuickSupport)</h3>
<p>Imposters posing as bank executives or customer care will ask you to install remote access apps to 'troubleshoot' your transaction. Never install screen-sharing software at the request of an unknown caller.</p>

<h3>Rule 4: Call 1930 Immediately if Compromised</h3>
<p>If you suspect an unauthorized transaction, immediately dial <strong>1930</strong> (National Cybercrime Reporting Helpline in India) or register at <a href="https://cybercrime.gov.in">cybercrime.gov.in</a> within the golden hour to freeze the transferred funds.</p>
        `,
        coverImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
        coverImageAlt: "Cyber security and online banking safety guide",
        category: categoryMap["digital-safety"],
        author: authorDoc._id,
        status: "published",
        isFeatured: false,
        isTrending: true,
        readingTimeMinutes: 3,
        publishedAt: new Date(),
        translationGroupId: "grp_upi_safety_guide",
        seo: {
          metaTitle: "5 Rules to Prevent UPI & Online Banking Fraud - RAAZ",
          metaDescription: "Comprehensive safety guide for online transactions, UPI PIN security, and immediate steps with national helpline 1930.",
        },
      },
      {
        title: "2026 में आर्टिफिशियल इंटेलिजेंस (AI) का सही इस्तेमाल: छात्रों और प्रोफेशनल्स के लिए गाइड",
        slug: "how-to-use-ai-tools-effectively-students-professionals",
        locale: "hi",
        excerpt: "क्या आप AI टूल्स को केवल सवाल पूछने के लिए इस्तेमाल कर रहे हैं? जानिए कैसे AI को अपना पर्सनल रिसर्च असिस्टेंट और प्रोडक्टिविटी पार्टनर बनाएं।",
        content: `
<h2>AI: सिर्फ चैटबॉट नहीं, प्रोडक्टिविटी का सुपरपावर</h2>
<p>ChatGPT, Claude, और Gemini जैसे आधुनिक AI मॉडल केवल जवाब देने की मशीन नहीं हैं, बल्कि वे आपके अध्ययन, कोडिंग, और व्यावसायिक रिपोर्टिंग को 10 गुना तेज बना सकते हैं।</p>

<h3>1. रोल-बेस्ड प्रॉम्प्टिंग तकनीक का प्रयोग करें</h3>
<p>AI से सामान्य सवाल पूछने के बजाय उसे एक भूमिका (Role) दें। उदाहरण के लिए: <em>"एक सीनियर डेटा साइंटिस्ट की तरह मुझे मशीन लर्निंग के न्यूरल नेटवर्क की कार्यप्रणाली कक्षा 10 के विद्यार्थी के स्तर पर समझाएं।"</em></p>

<h3>2. बड़े दस्तावेजों और शोध पत्रों का संक्षेप तैयार करें</h3>
<p>किसी 50 पेज की पीडीएफ या सरकारी रिपोर्ट को पढ़ने में घंटों लगाने के बजाय मुख्य बिंदुओं, आंकड़ों और निष्कर्षों का बुलेट-पॉइंट सारांश मांगें।</p>

<h3>3. फैक्ट-चेक करना कभी न भूलें</h3>
<p>AI कभी-कभी गलत या अनुमानित जानकारी भी दे सकता है (जिसे AI Hallucination कहा जाता है)। आधिकारिक स्रोतों और किताबों से महत्वपूर्ण डेटा हमेशा सत्यापित करें।</p>
        `,
        coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&auto=format&fit=crop&q=80",
        coverImageAlt: "आर्टिफिशियल इंटेलिजेंस और प्रोडक्टिविटी गाइड",
        category: categoryMap["ai"],
        author: authorDoc._id,
        status: "published",
        isFeatured: true,
        isTrending: false,
        readingTimeMinutes: 5,
        publishedAt: new Date(),
        translationGroupId: "grp_ai_guide_2026",
        seo: {
          metaTitle: "AI का सही इस्तेमाल कैसे करें? छात्रों और प्रोफेशनल्स के लिए गाइड - RAAZ",
          metaDescription: "प्रॉम्प्ट इंजीनियरिंग, डॉक्यूमेंट समरी और AI टूल्स के उपयोग का सरल हिंदी ट्यूटोरियल।",
        },
      },
    ];

    for (const art of articles) {
      const existingArt = await Article.findOne({ slug: art.slug, locale: art.locale });
      if (!existingArt) {
        await Article.create(art);
      }
    }
    console.log("✅ High-quality bilingual starter articles seeded.");

    console.log("🎉 RAAZ Database Initialization Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ RAAZ Seeding failed:", error);
    process.exit(1);
  }
}

seedRaaz();
