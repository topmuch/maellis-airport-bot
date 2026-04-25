import crypto from 'crypto'
import { db } from '../src/lib/db'

const FAQ_DATA = [
  // ═══ BAGAGES & SERVICES ═══
  {
    category: 'baggage',
    question: { fr: 'Où sont les consignes à bagages ?', en: 'Where are the luggage lockers?', wo: 'Fan la consigne à bagage bi?' },
    answer: { fr: 'Consignes à bagages disponibles Terminal 2, Niveau 0.\n\nHoraires : 06h00 - 22h00\nTarif : 5 000 FCFA / 24h\nTaille max : Grand format accepté\n\n💡 Astuce : Réservez via Smartly en envoyant "consigne bagage"', en: 'Luggage lockers available Terminal 2, Level 0.\n\nHours: 06:00 - 22:00\nRate: 5,000 FCFA / 24h\nMax size: Large format accepted\n\n💡 Tip: Book via Smartly by sending "consigne bagage"', wo: 'Consigne à bagage bi Terminal 2, Niveau 0.\n\nWaktu : 06h00 - 22h00\nXalis : 5 000 FCFA / 24h\n\n💡 Smartly bayil "consigne bagage" yonne' },
    keywords: ['consigne', 'bagage', 'stockage', 'valise', 'locker', 'sauvegarde', 'caser', 'baggage'],
    priority: 5,
  },
  {
    category: 'baggage',
    question: { fr: "J'ai perdu mon sac, que faire ?", en: 'I lost my bag, what should I do?', wo: 'Sama sax bi dof, ma doon nu sama?' },
    answer: { fr: "Procédure objets perdus :\n\n1️⃣ Allez au comptoir Objets Trouvés — Terminal 1, Niveau 1, Hall D\n2️⃣ Présentez votre carte d'embarquement et pièce d'identité\n3️⃣ Remplissez le formulaire de déclaration\n4️⃣ Scannez le QR Bagage via Smartly pour suivi\n\n📞 Contact : +221 33 869 69 70\n🕐 Ouvert 24h/24", en: 'Lost items procedure:\n\n1️⃣ Go to Lost & Found counter — Terminal 1, Level 1, Hall D\n2️⃣ Present your boarding pass and ID\n3️⃣ Fill out the declaration form\n4️⃣ Scan QR Baggage via Smartly for tracking\n\n📞 Contact: +221 33 869 69 70\n🕐 Open 24/7', wo: "Liggey ay sax dawe :\n\n1️⃣ Demb Terminal 1, Niveau 1, Hall D\n2️⃣ Carte embarquement ak piès identité indil\n3️⃣ Formulaire yeekh\n4️⃣ Smartly dinaan QR Bagage\n\n📞 +221 33 869 69 70\n🕐 24h/24" },
    keywords: ['perdu', 'trouvé', 'objet', 'sac', 'volé', 'perte', 'lost', 'stolen', 'missing', 'dof'],
    priority: 10,
  },
  {
    category: 'baggage',
    question: { fr: 'Où retirer mon bagage en soute ?', en: 'Where to pick up checked luggage?', wo: 'Fan ma jëkka sama bagage bi?' },
    answer: { fr: 'Retrait bagages soute :\n\n📍 Tapis 1-2 : Vols intérieurs\n📍 Tapis 3-4 : Vols internationaux\n📍 Terminal 1, Niveau Arrivées\n\n⏱️ Délai : 15-30 min après atterrissage\n🔍 Suivez les écrans d\'information', en: 'Checked luggage pickup:\n\n📍 Carousel 1-2: Domestic flights\n📍 Carousel 3-4: International flights\n📍 Terminal 1, Arrivals Level\n\n⏱️ Wait time: 15-30 min after landing\n🔍 Follow the information screens', wo: 'Jëkka bagage :\n\n📍 Tapis 1-2 : Vols intérieurs\n📍 Tapis 3-4 : Vols internationaux\n📍 Terminal 1, Niveau Arrivées\n\n⏱️ 15-30 min aprés atterrissage' },
    keywords: ['soute', 'retrait', 'tapis', 'arrivée', 'bagage', 'carousel', 'checked', 'jëkka', 'claim'],
    priority: 5,
  },
  // ═══ ARGENT & PAIEMENTS ═══
  {
    category: 'money',
    question: { fr: 'Où trouver un bureau de change ?', en: 'Where can I find a currency exchange?', wo: 'Fan la bureau de change bi?' },
    answer: { fr: 'Bureaux de change disponibles :\n\n🏪 Terminal 1, Hall Départ — 06h00-22h00\n🏪 Terminal 2, Hall Arrivées — 07h00-23h00\n\n💱 Devises : EUR, USD, GBP, MAD, GMD\n💡 Meilleurs taux le matin\n\n📱 Smartly : envoyez "change" pour le taux en direct', en: 'Currency exchange available:\n\n🏪 Terminal 1, Departures Hall — 06:00-22:00\n🏪 Terminal 2, Arrivals Hall — 07:00-23:00\n\n💱 Currencies: EUR, USD, GBP, MAD, GMD\n💡 Best rates in the morning\n\n📱 Smartly: send "change" for live rates', wo: 'Bureau de change bi :\n\n🏪 Terminal 1 — 06h00-22h00\n🏪 Terminal 2 — 07h00-23:00\n\n💱 EUR, USD, GBP, MAD, GMD\n\n📱 Smartly "change" yonne' },
    keywords: ['change', 'devises', 'euros', 'dollars', 'argent', 'currency', 'exchange', 'dollar', 'taux', 'ceurs'],
    priority: 5,
  },
  {
    category: 'money',
    question: { fr: 'Y a-t-il des distributeurs ?', en: 'Are there ATMs?', wo: 'Distributeur am na?' },
    answer: { fr: 'Distributeurs automatiques :\n\n🏧 Terminal 1 : Hall Départ (x3) + Hall Arrivées (x2)\n🏧 Terminal 2 : Hall Départ (x2) + Hall Arrivées (x1)\n\n💳 Acceptés : Visa, Mastercard, CB\n💸 Retrait max : 500 000 FCFA\n⛽ Frais : ~300 FCFA (carte étrangère)\n\n📱 Smartly : "distributeur" pour localisation', en: 'ATMs available:\n\n🏧 Terminal 1: Departures Hall (x3) + Arrivals Hall (x2)\n🏧 Terminal 2: Departures Hall (x2) + Arrivals Hall (x1)\n\n💳 Accepted: Visa, Mastercard\n💸 Max withdrawal: 500,000 FCFA\n⛽ Fees: ~300 FCFA (foreign card)', wo: 'Distributeur bi :\n\n🏧 Terminal 1 + Terminal 2\n💳 Visa, Mastercard\n💸 Max 500 000 FCFA' },
    keywords: ['distributeur', 'dab', 'atm', 'retrait', 'espèces', 'cash', 'liquide', 'argent'],
    priority: 3,
  },
  {
    category: 'money',
    question: { fr: 'Puis-je payer par carte ?', en: 'Can I pay by card?', wo: 'Ma pay ci carte la?' },
    answer: { fr: "Paiement par carte :\n\n✅ Accepté PARTOUT dans l'aéroport\n✅ Visa, Mastercard, CB, American Express\n\n⚠️ Exceptions :\n❌ Taxis officiels — Cash uniquement\n❌ Certains petits commerces — Prévoir du cash\n\n💳 Paiement mobile : Orange Money, Wave acceptés", en: 'Card payment:\n\n✅ Accepted EVERYWHERE in the airport\n✅ Visa, Mastercard, American Express\n\n⚠️ Exceptions:\n❌ Official taxis — Cash only\n❌ Some small shops — Have cash ready\n\n💳 Mobile payment: Orange Money, Wave accepted', wo: 'Paiement carte :\n\n✅ Aéroport bu fan\n✅ Visa, Mastercard, CB\n\n❌ Taxis — Cash rekk\n\n💳 Orange Money, Wave' },
    keywords: ['carte', 'paiement', 'visa', 'mastercard', 'payer', 'card', 'credit', 'débit'],
    priority: 3,
  },
  // ═══ TRANSPORT & PARKING ═══
  {
    category: 'transport',
    question: { fr: 'Où est le parking ?', en: 'Where is the parking?', wo: 'Fan la parking bi?' },
    answer: { fr: 'Parkings aéroport :\n\n🅿️ P1 — Court séjour (devant Terminal 1)\n🅿️ P2 — Long séjour (à 200m)\n🅿️ P3 — Économique (navette gratuite)\n\n💰 Tarifs :\n• 2 000 FCFA / heure\n• 15 000 FCFA / jour\n• 50 000 FCFA / semaine\n\n🔑 Sécurisé 24h/24, vidéosurveillance\n📱 Smartly : "parking" pour dispo en temps réel', en: 'Airport parking:\n\n🅿️ P1 — Short stay (Terminal 1)\n🅿️ P2 — Long stay (200m away)\n🅿️ P3 — Economy (free shuttle)\n\n💰 Rates:\n• 2,000 FCFA / hour\n• 15,000 FCFA / day\n• 50,000 FCFA / week\n\n🔑 24/7 security, CCTV', wo: 'Parking bi :\n\n🅿️ P1 — Court séjour\n🅿️ P2 — Long séjour\n🅿️ P3 — Économique\n\n💰 2 000 FCFA/h, 15 000 FCFA/jour\n\n📱 Smartly "parking" yonne' },
    keywords: ['parking', 'voiture', 'stationnement', 'garer', 'P1', 'P2', 'P3', 'véhicule'],
    priority: 5,
  },
  {
    category: 'transport',
    question: { fr: 'Comment réserver un taxi ?', en: 'How to book a taxi?', wo: 'Naka taksi book ci?' },
    answer: { fr: "🚕 Réserver un taxi via Smartly :\n\nEnvoyez simplement : \"Je veux un taxi\"\n\n→ Départ / Destination ?\n→ Choix : Taxi officiel / VTC privé\n→ Confirmation instantanée\n→ Paiement en espèces ou mobile money\n\n📍 Point de taxis : Sortie Terminal 1, porte 3\n\nTarif indicatif :\n• Aéroport → Dakar Centre : 5 000 - 10 000 FCFA\n• Aéroport → Almadies : 10 000 - 15 000 FCFA", en: '🚕 Book a taxi via Smartly:\n\nJust send: "I want a taxi"\n\n→ Pickup / Destination?\n→ Choice: Official taxi / Private VTC\n→ Instant confirmation\n→ Cash or mobile money payment\n\n📍 Taxi rank: Terminal 1 exit, gate 3', wo: "🚕 Taksi book Smartly :\n\n\"Je veux un taxi\" yonne\n\n→ Départ / Destination ?\n→ Taxi officiel / VTC\n→ Confirmation instantanée\n\n📍 Terminal 1, porte 3" },
    keywords: ['taxi', 'réserv', 'transport', 'vtc', 'uber', 'chauffeur', 'course', 'book', 'je veux'],
    priority: 8,
  },
  // ═══ RESTAURATION & SHOPPING ═══
  {
    category: 'food',
    question: { fr: 'Quels restaurants sont ouverts la nuit ?', en: 'Which restaurants are open at night?', wo: 'Benn lu restaurant bi yendu fi guddi?' },
    answer: { fr: 'Restaurants ouverts 24h/24 :\n\n☕ Terminal 1 :\n• Café Dioum (Hall Départ) — Café, sandwichs\n• Quick Service (Niveau 0) — Fast-food\n\n🍽️ Terminal 2 :\n• L\'Escale (Hall Arrivées) — Restaurant complet\n\n☕ Ouverts tard (jusqu\'à 23h) :\n• Relais H, Paul, Panorama Lounge\n\n📱 Smartly : "restaurant ouvert" pour liste en direct', en: '24/7 restaurants:\n\n☕ Terminal 1:\n• Café Dioum (Departures Hall) — Coffee, sandwiches\n• Quick Service (Level 0) — Fast-food\n\n🍽️ Terminal 2:\n• L\'Escale (Arrivals Hall) — Full restaurant', wo: 'Restaurant 24h/24 bi :\n\n☕ Terminal 1: Café Dioum, Quick Service\n🍽️ Terminal 2: L\'Escale\n\n📱 Smartly "restaurant ouvert" yonne' },
    keywords: ['restaurant', 'manger', 'nourriture', 'ouvert', 'nuit', 'minuit', '24h', 'faim', 'café', 'dinner'],
    priority: 3,
  },
  {
    category: 'food',
    question: { fr: 'Y a-t-il une pharmacie ?', en: 'Is there a pharmacy?', wo: 'Pharmacie am na?' },
    answer: { fr: '🏥 Pharmacie aéroport :\n\n📍 Terminal 1, Porte B5, Niveau Départ\n🕐 Ouvert 24h/24, 7j/7\n\n💊 Produits disponibles :\n• Médicaments courants\n• Produits d\'hygiène\n• Accessoires voyage\n\n🩺 Service infirmier adjacent\n📞 +221 33 869 69 80', en: '🏥 Airport pharmacy:\n\n📍 Terminal 1, Gate B5, Departures Level\n🕐 Open 24/7\n\n💊 Available:\n• Common medicines\n• Hygiene products\n• Travel accessories', wo: '🏥 Pharmacie bi :\n\n📍 Terminal 1, Porte B5\n🕐 24h/24, 7j/7\n\n💊 Médicaments, hygiène' },
    keywords: ['pharmacie', 'médicament', 'santé', 'traitement', 'pharmacy', 'medicine', 'health', 'dokteer'],
    priority: 7,
  },
  // ═══ URGENCES & INFOS PRATIQUES ═══
  {
    category: 'emergency',
    question: { fr: 'Où est l\'infirmerie ?', en: 'Where is the medical center?', wo: 'Fan la infirmerie bi?' },
    answer: { fr: '🏥 Infirmerie aéroport :\n\n📍 Terminal 1, Niveau 1, près Porte B10\n🕐 Ouvert 24h/24\n\n🚨 Urgences médicales prises en charge\n🩺 Personnel qualifié\n🚑 Ambulance sur site\n\n📞 Urgences : +221 33 869 69 70\n📞 SAMU : 15', en: '🏥 Airport medical center:\n\n📍 Terminal 1, Level 1, near Gate B10\n🕐 Open 24/7\n\n🚨 Medical emergencies handled\n🩺 Qualified staff\n🚑 Ambulance on site\n\n📞 Emergencies: +221 33 869 69 70', wo: '🏥 Infirmerie bi :\n\n📍 Terminal 1, Niveau 1\n🕐 24h/24\n\n📞 +221 33 869 69 70' },
    keywords: ['infirmerie', 'médical', 'docteur', 'malade', 'santé', 'urgence', 'hospital', 'first aid', 'soin'],
    priority: 10,
  },
  {
    category: 'emergency',
    question: { fr: 'Comment contacter la police ?', en: 'How to contact the police?', wo: 'Naka la police contact ci?' },
    answer: { fr: '👮 Police aéroportuaire :\n\n📍 Poste T1 : Hall Départ, niveau 0\n📍 Poste T2 : Hall Arrivées\n📞 +221 33 869 69 70\n\n🚨 Vols, agressions, objets suspects\n🕐 Disponible 24h/24\n\n📱 Numéro d\'urgence national : 17', en: '👮 Airport police:\n\n📍 T1 Post: Departures Hall, level 0\n📍 T2 Post: Arrivals Hall\n📞 +221 33 869 69 70\n\n🚨 Theft, assault, suspicious objects\n🕐 Available 24/7', wo: '👮 Police bi :\n\n📍 Terminal 1 ak 2\n📞 +221 33 869 69 70\n🚨 24h/24' },
    keywords: ['police', 'commissariat', 'vol', 'agression', 'secours', 'urgence', '17', 'help', 'police'],
    priority: 10,
  },
  {
    category: 'emergency',
    question: { fr: 'Où sont les toilettes ?', en: 'Where are the restrooms?', wo: 'Fan la toilette bi?' },
    answer: { fr: '🚻 Toilettes dans tous les terminaux :\n\n📍 Terminal 1 : Niveaux 0, 1 et 2 (Hall Départ + Arrivées)\n📍 Terminal 2 : Niveaux 0 et 1\n\n♿ Accessibles PMR dans chaque zone\n👶 Table à langer dans la majorité\n🚰 Douches disponibles au niveau 0\n\n✅ Gratuites, propres, surveillées', en: '🚻 Restrooms in all terminals:\n\n📍 Terminal 1: Levels 0, 1 and 2\n📍 Terminal 2: Levels 0 and 1\n\n♿ Wheelchair accessible\n👶 Changing tables available\n🚰 Showers at level 0\n\n✅ Free, clean, monitored', wo: '🚻 Toilette bi terminal yilepp :\n\n📍 Terminal 1 : Niveaux 0, 1, 2\n📍 Terminal 2 : Niveaux 0, 1\n\n♿ PMR access\n✅ Gratis' },
    keywords: ['toilette', 'wc', 'sanitaire', 'salle de bain', 'douche', 'restroom', 'bathroom', 'toilet'],
    priority: 2,
  },
  // ═══ AUTRES ═══
  {
    category: 'other',
    question: { fr: 'Y a-t-il du WiFi gratuit ?', en: 'Is there free WiFi?', wo: 'WiFi bu gratis am na?' },
    answer: { fr: '📶 WiFi aéroport gratuit :\n\nSSID : AEROPORT_DSS_FREE\n🔓 Pas de mot de passe\n⏱️ 4h de connexion gratuite\n\n📶 WiFi Premium :\nSSID : AEROPORT_DSS_PREMIUM\n🔑 "SMARTLY2024" (code promo)\n⏱️ Connexion rapide, streaming possible\n\n📱 Smartly : "wifi" pour aide connexion', en: '📶 Free airport WiFi:\n\nSSID: AEROPORT_DSS_FREE\n🔓 No password\n⏱️ 4h free connection\n\n📶 Premium WiFi:\nSSID: AEROPORT_DSS_PREMIUM\n🔑 "SMARTLY2024"\n⏱️ Fast connection, streaming available', wo: '📶 WiFi bi :\n\nSSID: AEROPORT_DSS_FREE\n🔓 Mot de passe ul\n⏱️ 4h gratis\n\n📱 "wifi" yonne' },
    keywords: ['wifi', 'internet', 'connexion', 'réseau', 'wi-fi', 'gratuit', 'free', 'internet'],
    priority: 2,
  },
  {
    category: 'other',
    question: { fr: 'Comment envoyer un colis depuis l\'aéroport ?', en: 'How to send a parcel from the airport?', wo: 'Naka defar la colis aéroport bi?' },
    answer: { fr: '📦 Service colis & expéditions :\n\n📍 DHL Express — Terminal 1, Hall Départ\n📍 Chronopost — Terminal 2, Hall Arrivées\n🕐 08h00 - 20h00\n\n📤 Envoi national et international\n📋 Documents + colis\n💳 Paiement par carte ou cash\n\n📱 Smartly : "envoyer colis" pour suivi', en: '📦 Parcel & shipping:\n\n📍 DHL Express — Terminal 1, Departures Hall\n📍 Chronopost — Terminal 2, Arrivals Hall\n🕐 08:00 - 20:00\n\n📤 National and international', wo: '📦 Defar bi :\n\n📍 DHL Express — Terminal 1\n📍 Chronopost — Terminal 2\n🕐 08h00 - 20h00' },
    keywords: ['colis', 'envoyer', 'expédier', 'dhl', 'chronopost', 'courrier', 'paquet', 'parcel', 'shipping', 'defar'],
    priority: 2,
  },
]

async function seedFAQs() {
  console.log('🌱 Seeding FAQ database...\n')

  let created = 0
  let skipped = 0

  for (const item of FAQ_DATA) {
    try {
      // Check if already exists (question is stored as JSON string, so use contains)
      const existing = await db.fAQ.findFirst({
        where: {
          airportCode: 'DSS',
          category: item.category,
          question: { contains: item.question.fr },
        },
      })

      if (existing) {
        skipped++
        console.log(`  ⏭️  Skipped (exists): ${item.question.fr.substring(0, 50)}...`)
        continue
      }

      await db.fAQ.create({
        data: {
          id: crypto.randomBytes(12).toString('hex'),
          airportCode: 'DSS',
          category: item.category,
          question: JSON.stringify(item.question),
          answer: JSON.stringify(item.answer),
          keywords: JSON.stringify(item.keywords),
          priority: item.priority,
          isActive: true,
          updatedAt: new Date(),
        },
      })

      created++
      console.log(`  ✅ Created: ${item.question.fr.substring(0, 50)}... [${item.category}]`)
    } catch (error) {
      console.error(`  ❌ Error creating FAQ: ${error}`)
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`)
  console.log(`📚 Total FAQs in DB: ${await db.fAQ.count({ where: { airportCode: 'DSS' } })}`)
}

seedFAQs()
  .catch(console.error)
  .finally(() => process.exit(0))
