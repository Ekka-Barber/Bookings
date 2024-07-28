document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    const categories = {
        "Packages": {
            en: "Packages",
            ar: "باكجات",
            services: [
                {
                    name_en: "Haircut & Beard Trim",
                    name_ar: "حلاقة الشعر والدقن",
                    duration: "40m",
                    price: 50,
                    description_en: "Includes haircut and beard trim, along with a hair wash using Keune shampoo and complimentary scented towels",
                    description_ar: "تشمل قص الشعر والذقن - غسيل الشعر وفوط صحية معطرة مجانية"
                },
                {
                    name_en: "EKKA Package",
                    name_ar: "باقة إكّــه",
                    duration: "1h",
                    price: 150,
                    description_en: "Haircut with beard trimming\nSteam facial cleansing - exfoliation\nDuring facial cleansing: Relaxing massage using a massaging device\nWaxing for the face, ear, and nose\nHair oil treatment\nHair wash\nBlow-drying\nNose strip (blackhead removal)\n\nComplimentary sanitized cold and hot towels\nThis offer does not include any other discounts.",
                    description_ar: "قص شعر مع ذقن\nتنظيف البشرة بالبخار - صنفرة\nوقت تنظيف البشرة مساج استرخائي باستخدام جهاز المساج\nشمع للوجه والاذن والانف\nحمام زيت للشعر\nغسيل شعر\nتجفيف استشوار\nلزقه انف"
                },
                {
                    name_en: "EKKA Extra Package",
                    name_ar: "باقة إكّــه اكسترا",
                    duration: "1h 30m",
                    price: 250,
                    description_en: "Ekkah Essential Package + Keratin Hair Treatments by Kune Brand:\n\nImpressive results:\n* Up to 80% reduction in internal hair damage\n** Hair becomes twice as soft after just one use.\nPerfect for brides-to-be ❤️",
                    description_ar: "باقة إكه الأساسة   بالإضافة علاجات الشعر بالكيراتين\nمن براند: كيون\n\nنتائج رائعة:\n- تقليل الضرر الداخلي للشعر بنسبة تصل إلى 80٪\n- شعر يصبح ناعمًا بمقدار الضعف بعد استخدام واحد فقط.\n\nمناسبة للعرسان ❤"
                },
                {
                    name_en: "Hair Care",
                    name_ar: "باقة العناية بالشعر",
                    duration: "50m",
                    price: 105,
                    description_en: "Haircut\nScalp Deep Cleansing\nHair oil treatment nourishes and moisturizes the scalp, while also promoting hair growth and giving it shine and health.\nBrand: Keune\nHair wash: Essential Shampoo\nBrand: Keune",
                    description_ar: "قص الشعر\nحمام الزيت يغذي ويرطب فروة الرأس والشعر يعزز نمو الشعر ويمنحه لمعانًا وصحة\nبراند: كيون\nغسيل الشعر: شامبو اسينشال\nبراند: كيون\nاستشوار وتصفيف الشعر"
                },
                {
                    name_en: "Hair Care + Scalp Deep Cleansing",
                    name_ar: "باقة العناية بالشعر + تنظيف فروة الرأس",
                    duration: "1h 15m",
                    price: 175,
                    description_en: "",
                    description_ar: ""
                }
            ]
        },
        "HairServices": {
            en: "Hair Services",
            ar: "خدمات الشعر",
            services: [
                {
                    name_en: "Hair Cut | Styling & Fading",
                    name_ar: "حلاقة الشعر - مقص وتدريج",
                    duration: "30m",
                    price: 30,
                    description_en: "Specialized in the latest styles of hair cutting and trimming. Using the machine for a single length, while the fading is done professionally.",
                    description_ar: "مختصين في أحدث ستايلات قص وتهذيب الشعر. بالمكينة يكون مقاس واحد فقط اما التدريج فهنا الاحتراف 🤩"
                },
                {
                    name_en: "Hair Cut | Long Hair",
                    name_ar: "حلاقة الشعر - شعر طويل",
                    duration: "45m",
                    price: 40,
                    description_en: "Specialized in the latest styles of hair cutting and trimming. Using the machine for a single length, while the fading is done professionally.",
                    description_ar: "مختصين في أحدث ستايلات قص وتهذيب الشعر. بالمكينة يكون مقاس واحد فقط اما التدريج فهنا الاحتراف 🤩"
                },
                {
                    name_en: "Hair Dye | Bigen dye",
                    name_ar: "صبغة شعر - صبغة بيجن",
                    duration: "15m",
                    price: 40,
                    description_en: "Bigen dye in black color.",
                    description_ar: "صبغة بيجن لون أسود"
                },
                {
                    name_en: "Hair Dye | Keune Dutch Brand",
                    name_ar: "صبغة شعر - صبغة كيون الهولندية",
                    duration: "15m",
                    price: 60,
                    description_en: "Keune dye, the Dutch brand with natural colors",
                    description_ar: "- صبغة كيون البراند الهولندي بألوان طبيعية\n-"
                },
                {
                    name_en: "Hair Wash",
                    name_ar: "غسيل الشعر",
                    duration: "5m",
                    price: 10,
                    description_en: "We use shampoos from the Dutch brand: Keune.",
                    description_ar: "نستخدم شامبوهات البراند الهولندي: كيون"
                },
                {
                    name_en: "Hair Styling",
                    name_ar: "استشوار وتصفيف الشعر",
                    duration: "5m",
                    price: 15,
                    description_en: "Blow-drying and styling hair using what's needed: wax and hair styling products from the finest global brands.",
                    description_ar: "استشوار وتصفيف الشعر واستخدام ما يلزم: واكس ومصففات الشعر من أجود البراندات العالمية"
                },
                {
                    name_en: "Hair Oil Bath",
                    name_ar: "حمام زيت الشعر",
                    duration: "10m",
                    price: 50,
                    description_en: "Hair oil bath. Brand: Keune.\n\nFree hair wash with specialized Keune shampoo, drying, and styling.",
                    description_ar: "حمام زيت شعر. براند: كيون\n\n- غسيل الشعر بشامبو كيون مختص وتجفيفه وتصفيفه مجاني"
                },
                {
                    name_en: "Hair Coloring (Highlights)",
                    name_ar: "صبغة ميش",
                    duration: "1h",
                    price: 350,
                    description_en: "Upgrade your style with our signature gray and silver highlights, tailored for the modern man. Embrace a distinguished look with a touch of sophistication.",
                    description_ar: "حدّث أسلوبك مع خصلاتنا الرمادية والفضية الخاصة، المصممة للرجل العصري. اعتمد مظهرًا مميزًا يضفي لمسة من الرقي"
                },
                {
                    name_en: "Hair Keratin | Short Hair",
                    name_ar: "حمام كيراتين لعلاج للشعر - شعر قصير",
                    duration: "30m",
                    price: 100,
                    description_en: "Oil bath (specialized) with Miracle Elixir Keratin ampoules. Brand: Keune.\nGreat results: Up to 80% reduction in internal hair damage. Hair becomes twice as soft after just one use.\n\nFree hair wash with specialized Keune shampoo, drying, and styling.",
                    description_ar: "حمام زيت (مختص) مع امبولات كيراتين ميراكل الكسير. براند: كيون. نتائج رائعة: تقليل الضرر الداخلي للشعر بنسبة تصل إلى - 80%. شعر يصبح ناعمًا بمقدار الضعف بعد استخدام واحد فقط.\n\n- غسيل الشعر بشامبو كيون مختص وتجفيفه وتصفيفه مجاني"
                },
                {
                    name_en: "Hair Keratin | Long Hair",
                    name_ar: "حمام كيراتين لعلاج للشعر - شعر طويل",
                    duration: "30m",
                    price: 120,
                    description_en: "Oil bath (specialized) with Miracle Elixir Keratin ampoules. Brand: Keune.\nGreat results: Up to 80% reduction in internal hair damage. Hair becomes twice as soft after just one use.\n\nFree hair wash with specialized Keune shampoo, drying, and styling.",
                    description_ar: "حمام زيت (مختص) مع امبولات كيراتين ميراكل الكسير. براند: كيون. نتائج رائعة: تقليل الضرر الداخلي للشعر بنسبة تصل إلى - 80%. شعر يصبح ناعمًا بمقدار الضعف بعد استخدام واحد فقط.\n\n- غسيل الشعر بشامبو كيون مختص وتجفيفه وتصفيفه مجاني"
                },
                {
                    name_en: "Hair Protein | Short Hair",
                    name_ar: "بروتين للشعر - شعر قصير",
                    duration: "2h",
                    price: 300,
                    description_en: "Our hair therapy relies on specific types of protein to fill in gaps for a straightened, healthier appearance. These gaps are created when hair loses some of its protein molecules.",
                    description_ar: "يعتمد علاج الشعر بالبروتين على أنواع معينة من البروتين يتم ملئ فراغات الشعر بها للحصول على شعر مفرود ذو مظهر صحي، تلك الفراغات التي تسبب بها تساقط الشعر لبعض جزيئات البروتين."
                },
                {
                    name_en: "Hair Protein | Long Hair",
                    name_ar: "بروتين للشعر - شعر طويل",
                    duration: "2h 30m",
                    price: 350,
                    description_en: "Our hair therapy relies on specific types of protein to fill in gaps for a straightened, healthier appearance. These gaps are created when hair loses some of its protein molecules.",
                    description_ar: "يعتمد علاج الشعر بالبروتين على أنواع معينة من البروتين يتم ملئ فراغات الشعر بها للحصول على شعر مفرود ذو مظهر صحي، تلك الفراغات التي تسبب بها تساقط الشعر لبعض جزيئات البروتين."
                },
                {
                    name_en: "Scalp Deep Cleansing",
                    name_ar: "تنظيف فروة الرأس العميق",
                    duration: "25m",
                    price: 70,
                    description_en: "Scalp deep cleansing service. Recommended for those with oily hair and scalp suffering from dandruff.\n\nThe product is organic and highly effective. Brand: Dutch Keune.",
                    description_ar: "خدمة تنظيف فروة الرأس. موصى بها لأصحاب الشعر الدهني وفروة الرأس التي تعاني من قشرة.\n\nالمنتج عضوي قوي الفعالية. البراند: كيون الهولندية"
                },
                {
                    name_en: "Hair Dye (no supplies needed)",
                    name_ar: "تطبيق صبغة الشعر",
                    duration: "25m",
                    price: 25,
                    description_en: "The client has the right to provide the dye that suits them, and we will execute their request professionally. Free hair wash and blow-drying.",
                    description_ar: "للعميل حق توفير الصيغة التي تناسبه وعلينا - تفيذ طلبه بكل احترافية. غسل شعر وتجفيفه استشوار مجاني"
                },
                {
                    name_en: "Haircut (Girls) | Short Hair",
                    name_ar: "قص شعر - بنات أطفال - شعر قصير",
                    duration: "40m",
                    price: 50,
                    description_en: "Haircut and trimming... by the most skilled barbers in the salon.",
                    description_ar: "قص شعر وترتيب اطرافه .. بيد أمهر حلاقين الصالون"
                },
                {
                    name_en: "Haircut (Girls) | Long Hair",
                    name_ar: "قص شعر - بنات أطفال - شعر طويل",
                    duration: "50m",
                    price: 80,
                    description_en: "Haircut and trimming... by the most skilled barbers in the salon.",
                    description_ar: "قص شعر وترتيب اطرافه .. بيد أمهر حلاقين الصالون"
                },
                {
                    name_en: "Hair Dryer (Girls)",
                    name_ar: "استشوار وتصفيف الشعر - بنات اطفال",
                    duration: "35m",
                    price: 50,
                    description_en: "Using Babyliss and blow dryer.",
                    description_ar: "باستخدام الببليس والاستشوار"
                }
            ]
        },
        "BeardServices": {
            en: "Beard Services",
            ar: "خدمات اللحية",
            services: [
                {
                    name_en: "Beard Shaving Or Trimming",
                    name_ar: "حلاقة الدقن",
                    duration: "25m",
                    price: 25,
                    description_en: "The service includes shaving or trimming the beard (and optional threading), along with a sanitized cold or hot towel",
                    description_ar: "تشمل الخدمة حلق أو تخفيف الذقن (وإزالة الشعر بالخيط حسب الرغبة)  مع منشفه معقمة باردة او حارة"
                },
                {
                    name_en: "Beard Dye - Stubble",
                    name_ar: "صبغة الدقن - السكسوكة",
                    duration: "15m",
                    price: 25,
                    description_en: "Bigen dye",
                    description_ar: "صبغة بيجن"
                },
                {
                    name_en: "Beard Dye - Full Beard",
                    name_ar: "صبغة الدقن - اللحية كاملة",
                    duration: "30m",
                    price: 30,
                    description_en: "Bigen dye",
                    description_ar: "صبغة بيجن"
                },
                {
                    name_en: "Moustache Dye",
                    name_ar: "صبغة الشنب",
                    duration: "10m",
                    price: 10,
                    description_en: "",
                    description_ar: ""
                },
                {
                    name_en: "Hair Dye (No Supplies Needed)",
                    name_ar: "تطبيق صبغة الدقن",
                    duration: "15m",
                    price: 15,
                    description_en: "The client has the right to provide the dye that suits them, and we will execute their request professionally\n\nFree hot or cold towel",
                    description_ar: "للعميل حق توفير الصيغة التي تناسبه وعلينا - تفيذ طلبه بكل احترافية\n\nفوطة حارة أو باردة مجانا"
                }
            ]
        },
        "FacialCare": {
            en: "Facial Care Services",
            ar: "خدمات البشرة",
            services: [
                {
                    name_en: "Classic Quick Face Cleaning",
                    name_ar: "صنفرة وجه سريعة كلاسيك",
                    duration: "5m",
                    price: 15,
                    description_en: "Quick facial Cleaning, removing dead skin and enhancing collagen in the skin\n\nComplimentary sanitized towels (hot and cold) included",
                    description_ar: "صنفرة سريعة للوجه، ازالة الجلد الميت وتعزيز الكولاجين في البشرة\n\nفوط معقمة (حار وبارد) مجانية"
                },
                {
                    name_en: "Premium Quick Face Cleaning",
                    name_ar: "صنفرة وجه سريعة بريميوم",
                    duration: "15m",
                    price: 25,
                    description_en: "Indulge in our Premium Quick Face Cleaning for a luxurious, revitalizing experience. Using Neutrogena Fresh & Clear Daily Exfoliator and Himalaya Charcoal Face Mask, our experts will deeply cleanse and rejuvenate your skin, leaving it smooth, clear, and radiant. Book now for a premium glow!",
                    description_ar: "استمتع بتجربة فاخرة ومنعشة مع خدمة صنفرة وجه سريعة بريميوم. باستخدام المقشر اليومي المنعش من نيوتروجينا وقناع الفحم من هيمالايا، سيقوم خبراؤنا بتنظيف وتجديد بشرتك بعمق، مما يتركها ناعمة ونقية ومشرقة. احجز الآن لتألق بريميوم!\n\nفوط معقمة (حار وبارد) مجانية"
                },
                {
                    name_en: "Classic Deep Skin Cleansing",
                    name_ar: "تنظيف عميق للبشرة بالبخار كلاسيك",
                    duration: "25m",
                    price: 50,
                    description_en: "Our facial cleansing blends care, deep hydration, offering a relaxing experience. Here's how:\n\n* Steam: Activate skin, open pores.\n* Blackhead Removal: Gentle techniques clear pores of impurities.\n* Exfoliation: Special facial scrub promotes circulation, vibrant skin.\n* Mask: Soothing, nourishing mask hydrates, reduces irritation.\n\nOur facial cleansing achieves healthy, glowing skin. \nLeave Ekkah Salon renewed and wonderful",
                    description_ar: "خدمة تنظيف الوجه تجمع بين الاهتمام والترطيب العميق لبشرتك بتجربة مريحة ومنعشة. تعرف على تنفيذها:\n\n* البخار (بماء الورد): تنشيط البشرة، فتح المسام \نوفوائد ماء الورد: 1)يساعد على تهدئة الجلد، 2)يقلل من احمرار الجلد، 3)يحتوى على مضادات الأكسدة لبشرة كلها نظارة، 4)رائحته الطيبة تخفف التوتر\n* إزالة الرؤوس السوداء: تقنيات لطيفة تنقي المسام من الشوائب\n* مقشر: منظف خاص ينشط الدورة الدموية ويمنح بشرة متألقة\n* القناع: مهدئ ومغذي يرطب ويقلل التهيج\n\nتنظيف الوجه يُحقق بشرة صحية ومشرقة. \nاختبره في صالون إكه واستمتع ببشرة جديدة ومتجددة."
                },
                {
                    name_en: "Premium Deep Skin Cleansing",
                    name_ar: "تنظيف عميق للبشرة بريميوم",
                    duration: "20m",
                    price: 75,
                    description_en: "Indulge in a luxurious and refreshing experience with our Premium Deep Skin Cleansing with steam. This service combines care and deep hydration for your skin with a thorough cleansing and complete renewal. We offer you:\n\n1. Steam (with rose water)\n- Activates the skin and opens pores.\n- Benefits of rose water: helps soothe the skin, reduces redness, contains antioxidants for a fresh look, and its pleasant scent relieves stress.\n\n2. Blackhead Removal\n- Gentle techniques cleanse pores of impurities.\n\n3. Refreshing Neutrogena Scrub\n- Using Neutrogena's refreshing daily scrub, we gently exfoliate to remove dead cells, leaving your skin smooth and clear.\n\n4. Himalaya Charcoal Mask\n- Apply the Himalaya Charcoal Mask to absorb oils and impurities from the pores, leaving the skin clean and refreshed.\n- The mask is removed with a cold towel to reduce irritation and hydrate the skin.\n\n== Complimentary sanitized hot and cold towels ==\n\nBook now for a premium glow and enjoy healthy and radiant skin.",
                    description_ar: "استمتع بتجربة فاخرة ومنعشة مع خدمة تنظيف عميق للبشرة بالبخار بريميوم. تجمع هذه الخدمة بين الاهتمام والترطيب العميق لبشرتك مع تنظيف عميق وتجديد كامل. نقدم لك:\n\n1.البخار (بماء الورد)\n- تنشيط البشرة وفتح المسام.\n- فوائد ماء الورد: يساعد على تهدئة الجلد، يقلل من احمرار الجلد، يحتوي على مضادات الأكسدة لبشرة كلها نظارة، ورائحته الطيبة تخفف التوتر.\n\n2 إزالة الرؤوس السوداء\n- تقنيات لطيفة تنقي المسام من الشوائب.\n\n3. مقشر نيوتروجينا المنعش\n- باستخدام المقشر اليومي المنعش من نيوتروجينا، سنقوم بتقشير لطيف لإزالة الخلايا الميتة، مما يترك بشرتك ناعمة ونقية.\n\n4.قناع الفحم من هيمالايا\n- يوضع قناع الفحم من هيمالايا لامتصاص الزيوت والشوائب من المسام، وترك البشرة نظيفة ومنتعشة.\n- تتم إزالة القناع بمنشفة باردة لتقليل التهيج وترطيب البشرة.\n\n== فوط معقمة (حار وبارد) مجانية ==\n\nاحجز الآن لتجربة تألق بريميوم والحصول على بشرة صحية ومشرقة."
                },
                {
                    name_en: "Face Mask",
                    name_ar: "ماسك للوجه",
                    duration: "10m",
                    price: 15,
                    description_en: "",
                    description_ar: ""
                },
                {
                    name_en: "Nose Cleaning Strips",
                    name_ar: "لزقة الأنف",
                    duration: "5m",
                    price: 5,
                    description_en: "For cleaning blackheads",
                    description_ar: "لتنظيف الرؤوس السوداء"
                },
                {
                    name_en: "Face Wax - Nose",
                    name_ar: "شمع لإزالة شعر الوجه - الأنف",
                    duration: "5m",
                    price: 10,
                    description_en: "Face hair removal session with wax including face, ear, nose",
                    description_ar: "جلسة ازالة شعر الوجه بالشمع شامل الوجه الأذن الأنف"
                },
                {
                    name_en: "Face Wax - Ears",
                    name_ar: "شمع لإزالة شعر الوجه - الأذنين",
                    duration: "10m",
                    price: 15,
                    description_en: "Face hair removal session with wax including face, ear, nose",
                    description_ar: "جلسة ازالة شعر الوجه بالشمع شامل الوجه الأذن الأنف"
                },
                {
                    name_en: "Face Wax - Full Waxing",
                    name_ar: "شمع لإزالة شعر الوجه - شمع كامل",
                    duration: "15m",
                    price: 30,
                    description_en: "Face hair removal session with wax including face, ear, nose",
                    description_ar: "جلسة ازالة شعر الوجه بالشمع شامل الوجه الأذن الأنف"
                }
            ]
        }
    };

    const employeeWorkingHours = {
        "Abdulkareem": ["12:00", "00:00"],
        "Hadi": ["12:00", "00:00"],
        "Khalid": ["12:00", "00:00"],
        "Tariq": ["12:00", "00:00"],
        "Mahmoud": ["12:00", "00:00"]
    };

    const barbers = {
        "Abdulkareem": { en: "Abdulkareem", ar: "عبدالكريم" },
        "Hadi": { en: "Hadi (Pub)", ar: "هادي" },
        "Khalid": { en: "Khalid", ar: "خالد" },
        "Tariq": { en: "Tariq", ar: "طارق" },
        "Mahmoud": { en: "Mahmoud", ar: "محمود" }
    };

    const translations = {
        'summary-title': { ar: 'ملخص الحجز:', en: 'Booking Summary:' },
        'selected-services': { ar: 'الخدمات المختارة:', en: 'Selected Services:' },
        'total-duration': { ar: 'المدة الإجمالية:', en: 'Total Duration:' },
        'total-price': { ar: 'السعر الإجمالي:', en: 'Total Price:' },
        'datetime-label': { ar: 'اختر التاريخ والوقت:', en: 'Choose Date and Time:' },
        'name-label': { ar: 'الاسم:', en: 'Name:' },
        'phone-label': { ar: 'رقم الهاتف:', en: 'Phone Number:' },
        'submit-button': { ar: 'احجز الآن', en: 'Book Now' },
        'whatsapp-message': {
            ar: "📱 سيتم تأكيد حجزك على الواتساب. 📲 سيصلك ردنا بالتأكيد قريباً! ✔️",
            en: "📱 Your booking will be confirmed via WhatsApp. 📲 We'll respond with confirmation soon! ✔️"
        }
    };

    let selectedServices = [];
    let currentLanguage = 'ar';
    let totalDuration = 0;
    let totalPrice = 0;
    let selectedBarber = '';

    const languageOptions = document.querySelectorAll('.language-option');
    const categoriesContainer = document.querySelector('.button-grid.categories');
    const servicesContainer = document.querySelector('.button-grid.services');
    const barberContainer = document.querySelector('.button-grid.barbers');
    const form = document.getElementById('bookingForm');

    if (languageOptions) {
        languageOptions.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.dataset.lang;
                currentLanguage = lang;
                document.documentElement.lang = lang;
                document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                languageOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                updateLanguage();
                if (categoriesContainer) {
                    categoriesContainer.innerHTML = '';
                    initializeCategories(categoriesContainer);
                }
                if (servicesContainer) {
                    servicesContainer.innerHTML = '';
                    const selectedCategoryButton = document.querySelector('.category-button.selected');
                    if (selectedCategoryButton) {
                        populateServices(selectedCategoryButton.dataset.key);
                    }
                }
                if (barberContainer) {
                    barberContainer.innerHTML = '';
                    initializeBarbers(barberContainer);
                }
            });
        });
    } else {
        console.error('Language options not found');
    }

    if (categoriesContainer) {
        initializeCategories(categoriesContainer);
    } else {
        console.error('Categories container not found');
    }

    if (barberContainer) {
        initializeBarbers(barberContainer);
    } else {
        console.error('Barber container not found');
    }

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Booking form not found');
    }

    updateSummary();

    function updateLanguage() {
        const elements = {
            'main-title': { ar: 'احجز موعدك', en: 'Book Your Appointment' },
            'category-label': { ar: 'اختر الفئة:', en: 'Choose Category:' },
            'service-label': { ar: 'اختر الخدمة:', en: 'Choose Service:' },
            'summary-title': { ar: 'ملخص الحجز:', en: 'Booking Summary:' },
            'selected-services': { ar: 'الخدمات المختارة:', en: 'Selected Services:' },
            'total-duration': { ar: 'المدة الإجمالية:', en: 'Total Duration:' },
            'total-price': { ar: 'السعر الإجمالي:', en: 'Total Price:' },
            'barber-label': { ar: 'اختر الحلاق:', en: 'Choose Barber:' },
            'datetime-label': { ar: 'اختر التاريخ والوقت:', en: 'Choose Date and Time:' },
            'name-label': { ar: 'الاسم:', en: 'Name:' },
            'phone-label': { ar: 'رقم الهاتف:', en: 'Phone Number:' },
            'submit-button': { ar: 'احجز الآن', en: 'Book Now' }
        };

        Object.entries(elements).forEach(([id, labels]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = labels[currentLanguage];
        });
        const whatsappMessage = document.getElementById('whatsapp-message');
        if (whatsappMessage) {
            whatsappMessage.textContent = translations['whatsapp-message'][currentLanguage];
        }

        updateCategoriesLanguage();
        updateServicesLanguage();
        updateBarbersLanguage();
        updateSummary();
    }

    function updateCategoriesLanguage() {
        const categoryButtons = document.querySelectorAll('.category-button');
        categoryButtons.forEach(button => {
            const category = button.dataset[currentLanguage];
            if (category) button.textContent = category;
        });
    }

    function updateServicesLanguage() {
        const serviceButtons = document.querySelectorAll('.service-button');
        serviceButtons.forEach(button => {
            const serviceName = button.dataset[currentLanguage];
            const service = Object.values(categories).flatMap(cat => cat.services).find(s => s.name_en === serviceName || s.name_ar === serviceName);
            if (service) {
                const name = currentLanguage === 'ar' ? service.name_ar : service.name_en;
                button.innerHTML = `${name}<br>(${service.duration} - SAR ${service.price})`;
            }
        });
    }

    function updateBarbersLanguage() {
        const barberButtons = document.querySelectorAll('.barber-button');
        barberButtons.forEach(button => {
            const barber = button.dataset.key;
            button.textContent = barbers[barber][currentLanguage];
        });
    }

    function initializeCategories(categoriesContainer) {
        Object.keys(categories).forEach(key => {
            const category = categories[key];
            const button = createButton(category[currentLanguage], 'category-button');
            button.dataset.en = category.en;
            button.dataset.ar = category.ar;
            button.dataset.key = key;
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                populateServices(key);
            });
            categoriesContainer.appendChild(button);
        });
    }

    function populateServices(categoryKey) {
        if (!servicesContainer) {
            console.error('Services container not found');
            return;
        }
        servicesContainer.innerHTML = '';
        const category = categories[categoryKey];
        category.services.forEach(service => {
            const name = currentLanguage === 'ar' ? service.name_ar : service.name_en;
            const serviceButton = createButton(`${name}<br>(${service.duration} - SAR ${service.price})`, 'service-button');
            serviceButton.dataset.en = service.name_en;
            serviceButton.dataset.ar = service.name_ar;

            const descriptionBox = document.createElement('div');
            descriptionBox.className = 'service-description';
            descriptionBox.textContent = currentLanguage === 'ar' ? service.description_ar : service.description_en;
            serviceButton.appendChild(descriptionBox);

            serviceButton.addEventListener('click', (e) => {
                e.preventDefault();
                toggleService(serviceButton, service);
            });
            servicesContainer.appendChild(serviceButton);
        });
    }

    function toggleService(button, service) {
        button.classList.toggle('selected');
        const serviceName = currentLanguage === 'ar' ? service.name_ar : service.name_en;

        if (selectedServices.includes(serviceName)) {
            selectedServices = selectedServices.filter(s => s !== serviceName);
            totalDuration -= parseDuration(service.duration);
            totalPrice -= service.price;
        } else {
            selectedServices.push(serviceName);
            totalDuration += parseDuration(service.duration);
            totalPrice += service.price;
        }

        showServiceDescription(button, service);
        updateSummary();
    }

    function showServiceDescription(button, service) {
        const descriptionBox = button.querySelector('.service-description');
        if (descriptionBox) {
            const description = currentLanguage === 'ar' ? service.description_ar : service.description_en;
            if (description) {
                descriptionBox.textContent = description;
                descriptionBox.style.maxHeight = button.classList.contains('selected') ? `${descriptionBox.scrollHeight}px` : '0';
            } else {
                descriptionBox.style.display = 'none';
            }
        }
    }

    function initializeBarbers(barberContainer) {
        Object.keys(barbers).forEach(barber => {
            const button = createButton(barbers[barber][currentLanguage], 'barber-button');
            button.dataset.en = barbers[barber].en;
            button.dataset.ar = barbers[barber].ar;
            button.dataset.key = barber;
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.barber-button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                selectedBarber = barber;
                initializeDateTimePicker(barber);
            });
            barberContainer.appendChild(button);
        });
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const phoneInput = document.getElementById('phone');
        const phonePattern = /^05[0-9]{8}$/;

        if (!phonePattern.test(phoneInput.value)) {
            alert(currentLanguage === 'ar' ? 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام' : 'Phone number must start with 05 and be 10 digits long');
            return;
        }

        const bookingData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            services: Array.from(selectedServices),
            totalDuration: formatDuration(totalDuration),
            totalPrice: totalPrice,
            barber: selectedBarber,
            datetime: document.getElementById('datetime').value
        };

        sendBookingToWhatsApp(bookingData);
    }

    function sendBookingToWhatsApp(bookingData) {
        const message = `
========= 
${currentLanguage === 'ar' ? 'الاسم' : 'Name'}: ${bookingData.name || ''}
${currentLanguage === 'ar' ? 'رقم الهاتف' : 'Phone Number'}: ${bookingData.phone || ''}
${currentLanguage === 'ar' ? 'الخدمات' : 'Services'}: 
${bookingData.services.map(service => `* ${service}`).join('\n')}
${currentLanguage === 'ar' ? 'المدة الإجمالية' : 'Total Duration'}: ${bookingData.totalDuration}
${currentLanguage === 'ar' ? 'السعر الإجمالي' : 'Total Price'}: ${bookingData.totalPrice} SAR
${currentLanguage === 'ar' ? 'الحلاق' : 'Barber'}: ${bookingData.barber || ''}
${currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date and Time'}: ${bookingData.datetime || ''}
=========
        `;
        window.open(`https://wa.me/966599791440?text=${encodeURIComponent(message)}`, '_blank');
    }

    function createButton(text, className) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.classList.add(className);
        return button;
    }

    function parseDuration(duration) {
        if (duration.includes('h')) {
            const [hours, minutes] = duration.split('h');
            return parseInt(hours) * 60 + parseInt(minutes || 0);
        } else {
            return parseInt(duration) || 0;
        }
    }

    function formatDuration(minutes) {
        if (isNaN(minutes)) {
            return currentLanguage === 'ar' ? '0 دقيقة' : '0 minutes';
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (currentLanguage === 'ar') {
            return hours > 0 ? `${hours} ساعة ${mins} دقيقة` : `${mins} دقيقة`;
        } else {
            return hours > 0 ? `${hours} hour(s) ${mins} minute(s)` : `${mins} minute(s)`;
        }
    }

    function updateSummary() {
        const selectedServicesElement = document.getElementById('selected-services');
        const totalDurationElement = document.getElementById('total-duration');
        const totalPriceElement = document.getElementById('total-price');

        if (!selectedServicesElement || !totalDurationElement || !totalPriceElement) {
            console.error('Summary elements not found');
            return;
        }

        const servicesLabel = translations['selected-services'][currentLanguage];
        const durationLabel = translations['total-duration'][currentLanguage];
        const priceLabel = translations['total-price'][currentLanguage];

        selectedServicesElement.innerHTML = `${servicesLabel} <span>${selectedServices.join(', ') || '-'}</span>`;
        totalDurationElement.innerHTML = `${durationLabel} <span>${formatDuration(totalDuration)}</span>`;
        totalPriceElement.innerHTML = `${priceLabel} <span>${totalPrice} ${currentLanguage === 'ar' ? 'ريال' : 'SAR'}</span>`;
    }

    function initializeDateTimePicker(barber) {
        const datetimeInput = document.getElementById('datetime');
        if (!datetimeInput) {
            console.error('Datetime input not found');
            return;
        }
        const workingHours = employeeWorkingHours[barber];
        if (typeof flatpickr === 'function') {
            flatpickr.localize(flatpickr.l10ns.ar); // Pre-load Arabic locale
            flatpickr(datetimeInput, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minTime: workingHours[0],
                maxTime: workingHours[1],
                locale: currentLanguage === 'ar' ? 'ar' : 'en',
                time_24hr: true,
                minuteIncrement: 15,
                onChange: function(selectedDates, dateStr, instance) {
                    console.log("Selected date and time:", dateStr);
                }
            });
        } else {
            console.error('Flatpickr is not loaded');
            datetimeInput.type = 'datetime-local';
            datetimeInput.step = '900'; // 15 minutes in seconds
        }
    }
});
