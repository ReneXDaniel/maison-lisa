/**
 * Demo catalogue for development. All copy is placeholder brand text — no
 * personal facts about Lisa. Replace through the admin dashboard.
 */
type L = "de" | "en" | "fr" | "es" | "it" | "nl" | "pl" | "pt";
type Tr = Record<L, [title: string, description: string]>;
type Shot = { kind: string; palette: "ivory" | "champagne" | "taupe" | "espresso" | "noir"; seed: number };

export const DEMO_SITE: (Shot & { key: string; w: number; h: number })[] = [
  { key: "hero", kind: "pair", palette: "noir", seed: 4, w: 2400, h: 1500 },
  { key: "silk-reveal", kind: "leg", palette: "champagne", seed: 9, w: 1800, h: 1200 },
  { key: "hotspots", kind: "stilllife", palette: "ivory", seed: 12, w: 1800, h: 1200 },
  { key: "about-portrait", kind: "drape", palette: "champagne", seed: 21, w: 1200, h: 1500 },
  { key: "bts-1", kind: "stilllife", palette: "champagne", seed: 31, w: 1200, h: 1500 },
  { key: "bts-2", kind: "drape", palette: "ivory", seed: 32, w: 1200, h: 1500 },
  { key: "bts-3", kind: "foot", palette: "taupe", seed: 33, w: 1200, h: 1500 },
  { key: "bts-4", kind: "shadow", palette: "ivory", seed: 34, w: 1200, h: 1500 },
  { key: "bts-5", kind: "lace", palette: "espresso", seed: 35, w: 1200, h: 1500 },
  { key: "bts-6", kind: "drape", palette: "espresso", seed: 36, w: 1200, h: 1500 },
  { key: "release-1", kind: "drape", palette: "noir", seed: 41, w: 1600, h: 1200 },
  { key: "release-2", kind: "stilllife", palette: "espresso", seed: 42, w: 1600, h: 1200 },
  { key: "release-3", kind: "shadow", palette: "champagne", seed: 43, w: 1600, h: 1200 },
];

export const DEMO_COLLECTIONS: { slug: string; cover: Shot; tr: Tr }[] = [
  {
    slug: "the-essentials",
    cover: { kind: "leg", palette: "ivory", seed: 1 },
    tr: {
      en: ["The Essentials", "Quiet, timeless compositions in ivory light — the foundation of the maison."],
      de: ["Die Essentials", "Stille, zeitlose Kompositionen in elfenbeinfarbenem Licht — das Fundament der Maison."],
      fr: ["Les Essentiels", "Des compositions calmes et intemporelles dans une lumière ivoire — le fondement de la maison."],
      es: ["Los Esenciales", "Composiciones serenas y atemporales en luz marfil: la base de la maison."],
      it: ["Gli Essenziali", "Composizioni quiete e senza tempo in luce avorio — il fondamento della maison."],
      nl: ["De Essentials", "Stille, tijdloze composities in ivoorkleurig licht — het fundament van het maison."],
      pl: ["Esencja", "Spokojne, ponadczasowe kompozycje w świetle kości słoniowej — fundament maison."],
      pt: ["Os Essenciais", "Composições serenas e intemporais em luz marfim — a base da maison."],
    },
  },
  {
    slug: "soft-elegance",
    cover: { kind: "pair", palette: "champagne", seed: 2 },
    tr: {
      en: ["Soft Elegance", "Warm tones, soft focus and the gentle rhythm of natural light."],
      de: ["Sanfte Eleganz", "Warme Töne, weicher Fokus und der sanfte Rhythmus natürlichen Lichts."],
      fr: ["Douce Élégance", "Des tons chauds, un flou délicat et le doux rythme de la lumière naturelle."],
      es: ["Elegancia Suave", "Tonos cálidos, enfoque suave y el ritmo delicado de la luz natural."],
      it: ["Eleganza Delicata", "Toni caldi, messa a fuoco morbida e il ritmo gentile della luce naturale."],
      nl: ["Zachte Elegantie", "Warme tinten, zachte focus en het rustige ritme van natuurlijk licht."],
      pl: ["Subtelna Elegancja", "Ciepłe odcienie, miękka ostrość i delikatny rytm naturalnego światła."],
      pt: ["Elegância Suave", "Tons quentes, foco suave e o ritmo delicado da luz natural."],
    },
  },
  {
    slug: "the-silk-collection",
    cover: { kind: "shadow", palette: "champagne", seed: 3 },
    tr: {
      en: ["The Silk Collection", "Champagne charmeuse, ivory satin and the play of light across fabric."],
      de: ["Die Seidenkollektion", "Champagnerfarbene Charmeuse, elfenbeinfarbener Satin und das Spiel des Lichts auf Stoff."],
      fr: ["La Collection Soie", "Charmeuse champagne, satin ivoire et le jeu de la lumière sur l'étoffe."],
      es: ["La Colección Seda", "Charmeuse champán, satén marfil y el juego de la luz sobre la tela."],
      it: ["La Collezione Seta", "Charmeuse champagne, raso avorio e il gioco della luce sul tessuto."],
      nl: ["De Zijdecollectie", "Champagnekleurige charmeuse, ivoren satijn en het spel van licht op stof."],
      pl: ["Kolekcja Jedwabna", "Szampańska charmeuse, satyna w kolorze kości słoniowej i gra światła na tkaninie."],
      pt: ["A Coleção Seda", "Charmeuse champanhe, cetim marfim e o jogo da luz sobre o tecido."],
    },
  },
  {
    slug: "the-details",
    cover: { kind: "stilllife", palette: "ivory", seed: 4 },
    tr: {
      en: ["The Details", "Close studies of lacquer, jewellery and texture — beauty at the smallest scale."],
      de: ["Die Details", "Nahstudien von Lack, Schmuck und Textur — Schönheit im kleinsten Maßstab."],
      fr: ["Les Détails", "Études rapprochées de laque, de bijoux et de textures — la beauté à la plus petite échelle."],
      es: ["Los Detalles", "Estudios de cerca de esmalte, joyas y texturas: la belleza a la menor escala."],
      it: ["I Dettagli", "Studi ravvicinati di smalto, gioielli e texture — la bellezza nella scala più piccola."],
      nl: ["De Details", "Close-ups van lak, sieraden en textuur — schoonheid op de kleinste schaal."],
      pl: ["Detale", "Zbliżenia lakieru, biżuterii i faktur — piękno w najmniejszej skali."],
      pt: ["Os Detalhes", "Estudos de perto de verniz, joias e texturas — a beleza na menor escala."],
    },
  },
  {
    slug: "the-private-edit",
    cover: { kind: "lace", palette: "noir", seed: 5 },
    tr: {
      en: ["The Private Edit", "A more intimate chapter. Further previews are reserved for verified adults."],
      de: ["Die Private Edition", "Ein intimeres Kapitel. Weitere Vorschauen sind verifizierten Erwachsenen vorbehalten."],
      fr: ["L'Édition Privée", "Un chapitre plus intime. Les autres aperçus sont réservés aux adultes vérifiés."],
      es: ["La Edición Privada", "Un capítulo más íntimo. Más vistas previas reservadas a adultos verificados."],
      it: ["L'Edizione Privata", "Un capitolo più intimo. Altre anteprime sono riservate agli adulti verificati."],
      nl: ["De Privé-editie", "Een intiemer hoofdstuk. Meer previews zijn voorbehouden aan geverifieerde volwassenen."],
      pl: ["Edycja Prywatna", "Bardziej intymny rozdział. Kolejne podglądy tylko dla zweryfikowanych dorosłych."],
      pt: ["A Edição Privada", "Um capítulo mais íntimo. Mais pré-visualizações reservadas a adultos verificados."],
    },
  },
  {
    slug: "exclusive-by-lisa",
    cover: { kind: "pair", palette: "espresso", seed: 6 },
    tr: {
      en: ["Exclusive by Lisa", "Signature editions, styled and selected personally by Lisa."],
      de: ["Exklusiv von Lisa", "Signature-Editionen, persönlich von Lisa gestylt und ausgewählt."],
      fr: ["Exclusif par Lisa", "Des éditions signature, stylisées et sélectionnées personnellement par Lisa."],
      es: ["Exclusivo de Lisa", "Ediciones firma, estilizadas y seleccionadas personalmente por Lisa."],
      it: ["Esclusiva di Lisa", "Edizioni firmate, curate e selezionate personalmente da Lisa."],
      nl: ["Exclusief van Lisa", "Signature-edities, persoonlijk gestyled en geselecteerd door Lisa."],
      pl: ["Ekskluzywnie od Lisy", "Edycje sygnowane, osobiście stylizowane i wybrane przez Lisę."],
      pt: ["Exclusivo da Lisa", "Edições assinatura, estilizadas e selecionadas pessoalmente pela Lisa."],
    },
  },
];

const same = (title: string, d: Record<L, string>): Tr => Object.fromEntries(Object.entries(d).map(([l, desc]) => [l, [title, desc]])) as Tr;

export const DEMO_PRODUCTS: { slug: string; collection: string; priceCents: number; featured?: boolean; verifiedPreviewOnly?: boolean; shots: Shot[]; tr: Tr }[] = [
  {
    slug: "ivory-morning", collection: "the-essentials", priceCents: 2900,
    shots: [{ kind: "leg", palette: "ivory", seed: 101 }, { kind: "drape", palette: "ivory", seed: 102 }, { kind: "shadow", palette: "ivory", seed: 103 }, { kind: "foot", palette: "ivory", seed: 104 }],
    tr: same("Ivory Morning", {
      en: "Morning light on ivory satin — a calm, editorial study.", de: "Morgenlicht auf elfenbeinfarbenem Satin — eine ruhige, editoriale Studie.",
      fr: "La lumière du matin sur un satin ivoire — une étude éditoriale paisible.", es: "Luz de la mañana sobre satén marfil: un estudio editorial sereno.",
      it: "Luce del mattino su raso avorio — uno studio editoriale sereno.", nl: "Ochtendlicht op ivoren satijn — een rustige, redactionele studie.",
      pl: "Poranne światło na satynie w kolorze kości słoniowej — spokojne studium.", pt: "Luz da manhã sobre cetim marfim — um estudo editorial sereno.",
    }),
  },
  {
    slug: "quiet-hours", collection: "the-essentials", priceCents: 2400,
    shots: [{ kind: "shadow", palette: "champagne", seed: 111 }, { kind: "leg", palette: "champagne", seed: 112 }, { kind: "drape", palette: "champagne", seed: 113 }, { kind: "pair", palette: "ivory", seed: 114 }],
    tr: same("Quiet Hours", {
      en: "Soft shadows and still afternoons, composed with restraint.", de: "Weiche Schatten und stille Nachmittage, mit Zurückhaltung komponiert.",
      fr: "Ombres douces et après-midis paisibles, composés avec retenue.", es: "Sombras suaves y tardes tranquilas, compuestas con contención.",
      it: "Ombre morbide e pomeriggi quieti, composti con misura.", nl: "Zachte schaduwen en stille middagen, ingetogen gecomponeerd.",
      pl: "Miękkie cienie i ciche popołudnia, skomponowane z umiarem.", pt: "Sombras suaves e tardes tranquilas, compostas com contenção.",
    }),
  },
  {
    slug: "soft-elegance-i", collection: "soft-elegance", priceCents: 3200,
    shots: [{ kind: "pair", palette: "champagne", seed: 121 }, { kind: "leg", palette: "taupe", seed: 122 }, { kind: "foot", palette: "champagne", seed: 123 }, { kind: "drape", palette: "taupe", seed: 124 }],
    tr: same("Soft Elegance I", {
      en: "Warm tones and gentle curves in natural window light.", de: "Warme Töne und sanfte Linien im natürlichen Fensterlicht.",
      fr: "Tons chauds et courbes délicates dans la lumière naturelle d'une fenêtre.", es: "Tonos cálidos y curvas suaves a la luz natural de una ventana.",
      it: "Toni caldi e curve delicate nella luce naturale di una finestra.", nl: "Warme tinten en zachte lijnen in natuurlijk vensterlicht.",
      pl: "Ciepłe odcienie i łagodne linie w naturalnym świetle okna.", pt: "Tons quentes e curvas suaves à luz natural de uma janela.",
    }),
  },
  {
    slug: "veil-of-light", collection: "soft-elegance", priceCents: 3500,
    shots: [{ kind: "shadow", palette: "taupe", seed: 131 }, { kind: "pair", palette: "taupe", seed: 132 }, { kind: "leg", palette: "champagne", seed: 133 }, { kind: "drape", palette: "champagne", seed: 134 }],
    tr: same("Veil of Light", {
      en: "Sheer textures that catch and soften the light.", de: "Zarte Texturen, die das Licht einfangen und weich zeichnen.",
      fr: "Des textures voilées qui captent et adoucissent la lumière.", es: "Texturas translúcidas que atrapan y suavizan la luz.",
      it: "Texture velate che catturano e ammorbidiscono la luce.", nl: "Transparante texturen die het licht vangen en verzachten.",
      pl: "Przejrzyste faktury, które chwytają i zmiękczają światło.", pt: "Texturas translúcidas que captam e suavizam a luz.",
    }),
  },
  {
    slug: "champagne-charmeuse", collection: "the-silk-collection", priceCents: 3900, featured: true,
    shots: [{ kind: "leg", palette: "champagne", seed: 141 }, { kind: "drape", palette: "champagne", seed: 142 }, { kind: "foot", palette: "champagne", seed: 143 }, { kind: "shadow", palette: "champagne", seed: 144 }],
    tr: same("Champagne Charmeuse", {
      en: "Liquid champagne silk and long, elegant lines.", de: "Fließende champagnerfarbene Seide und lange, elegante Linien.",
      fr: "Une soie champagne fluide et de longues lignes élégantes.", es: "Seda champán fluida y líneas largas y elegantes.",
      it: "Seta champagne fluida e linee lunghe ed eleganti.", nl: "Vloeiende champagnekleurige zijde en lange, elegante lijnen.",
      pl: "Płynny szampański jedwab i długie, eleganckie linie.", pt: "Seda champanhe fluida e linhas longas e elegantes.",
    }),
  },
  {
    slug: "silk-and-shadow", collection: "the-silk-collection", priceCents: 4200,
    shots: [{ kind: "shadow", palette: "ivory", seed: 151 }, { kind: "drape", palette: "taupe", seed: 152 }, { kind: "leg", palette: "ivory", seed: 153 }, { kind: "pair", palette: "champagne", seed: 154 }],
    tr: same("Silk & Shadow", {
      en: "Window shadows falling across draped satin.", de: "Fensterschatten, die über drapierten Satin fallen.",
      fr: "Des ombres de fenêtre glissant sur un satin drapé.", es: "Sombras de ventana sobre satén drapeado.",
      it: "Ombre di finestra che scivolano sul raso drappeggiato.", nl: "Vensterschaduwen over gedrapeerd satijn.",
      pl: "Cienie okna padające na drapowaną satynę.", pt: "Sombras de janela sobre cetim drapeado.",
    }),
  },
  {
    slug: "lacquer-study", collection: "the-details", priceCents: 1900,
    shots: [{ kind: "stilllife", palette: "ivory", seed: 161 }, { kind: "stilllife", palette: "champagne", seed: 162 }, { kind: "drape", palette: "ivory", seed: 163 }, { kind: "stilllife", palette: "taupe", seed: 164 }],
    tr: same("Lacquer Study", {
      en: "Three polishes, one ribbon — a still life of colour.", de: "Drei Lacke, ein Band — ein Stillleben in Farbe.",
      fr: "Trois vernis, un ruban — une nature morte en couleur.", es: "Tres esmaltes, una cinta: un bodegón de color.",
      it: "Tre smalti, un nastro — una natura morta a colori.", nl: "Drie lakken, één lint — een stilleven in kleur.",
      pl: "Trzy lakiery, jedna wstążka — martwa natura w kolorze.", pt: "Três vernizes, uma fita — uma natureza-morta em cor.",
    }),
  },
  {
    slug: "a-single-pearl", collection: "the-details", priceCents: 2200,
    shots: [{ kind: "foot", palette: "ivory", seed: 171 }, { kind: "foot", palette: "espresso", seed: 172 }, { kind: "stilllife", palette: "ivory", seed: 173 }, { kind: "drape", palette: "champagne", seed: 174 }],
    tr: same("A Single Pearl", {
      en: "A fine anklet, a single pearl, nothing more.", de: "Ein feines Fußkettchen, eine einzelne Perle, nichts weiter.",
      fr: "Une fine chaîne de cheville, une seule perle, rien de plus.", es: "Una fina tobillera, una sola perla, nada más.",
      it: "Una sottile cavigliera, una sola perla, nient'altro.", nl: "Een fijn enkelbandje, één parel, verder niets.",
      pl: "Delikatna bransoletka na kostkę, jedna perła, nic więcej.", pt: "Uma fina pulseira de tornozelo, uma única pérola, nada mais.",
    }),
  },
  {
    slug: "private-edit-no-1", collection: "the-private-edit", priceCents: 4900, verifiedPreviewOnly: true,
    shots: [{ kind: "lace", palette: "noir", seed: 181 }, { kind: "lace", palette: "espresso", seed: 182 }, { kind: "leg", palette: "noir", seed: 183 }, { kind: "pair", palette: "noir", seed: 184 }],
    tr: same("Private Edit No. 1", {
      en: "An intimate, lace-framed chapter in espresso tones.", de: "Ein intimes, von Spitze gerahmtes Kapitel in Espressotönen.",
      fr: "Un chapitre intime encadré de dentelle, dans des tons espresso.", es: "Un capítulo íntimo enmarcado en encaje, en tonos espresso.",
      it: "Un capitolo intimo incorniciato dal pizzo, in toni espresso.", nl: "Een intiem, met kant omlijst hoofdstuk in espressotinten.",
      pl: "Intymny rozdział w koronkowej oprawie, w odcieniach espresso.", pt: "Um capítulo íntimo emoldurado em renda, em tons espresso.",
    }),
  },
  {
    slug: "after-hours", collection: "the-private-edit", priceCents: 5500, verifiedPreviewOnly: true,
    shots: [{ kind: "pair", palette: "noir", seed: 191 }, { kind: "shadow", palette: "espresso", seed: 192 }, { kind: "lace", palette: "noir", seed: 193 }, { kind: "foot", palette: "noir", seed: 194 }],
    tr: same("After Hours", {
      en: "Low light, deep tones and quiet confidence.", de: "Gedämpftes Licht, tiefe Töne und stille Selbstsicherheit.",
      fr: "Lumière tamisée, tons profonds et assurance tranquille.", es: "Luz tenue, tonos profundos y una confianza serena.",
      it: "Luce soffusa, toni profondi e sicurezza silenziosa.", nl: "Gedempt licht, diepe tinten en stil zelfvertrouwen.",
      pl: "Przyciemnione światło, głębokie odcienie i cicha pewność siebie.", pt: "Luz suave, tons profundos e uma confiança tranquila.",
    }),
  },
  {
    slug: "signature-edition", collection: "exclusive-by-lisa", priceCents: 6900, featured: true,
    shots: [{ kind: "pair", palette: "espresso", seed: 201 }, { kind: "leg", palette: "espresso", seed: 202 }, { kind: "stilllife", palette: "champagne", seed: 203 }, { kind: "shadow", palette: "champagne", seed: 204 }],
    tr: same("Signature Edition", {
      en: "Lisa's signature look — styled, lit and selected personally.", de: "Lisas Signature-Look — persönlich gestylt, beleuchtet und ausgewählt.",
      fr: "Le look signature de Lisa — stylisé, éclairé et sélectionné personnellement.", es: "El look firma de Lisa: estilizado, iluminado y seleccionado personalmente.",
      it: "Il look firma di Lisa — curato, illuminato e selezionato personalmente.", nl: "Lisa's signature-look — persoonlijk gestyled, belicht en geselecteerd.",
      pl: "Charakterystyczny styl Lisy — osobiście stylizowany, oświetlony i wybrany.", pt: "O look assinatura da Lisa — estilizado, iluminado e selecionado pessoalmente.",
    }),
  },
  {
    slug: "lisas-selection", collection: "exclusive-by-lisa", priceCents: 5900, featured: true,
    shots: [{ kind: "leg", palette: "taupe", seed: 211 }, { kind: "foot", palette: "champagne", seed: 212 }, { kind: "pair", palette: "ivory", seed: 213 }, { kind: "drape", palette: "espresso", seed: 214 }],
    tr: same("Lisa's Selection", {
      en: "A personal edit of favourite moments from the studio.", de: "Eine persönliche Auswahl liebster Momente aus dem Studio.",
      fr: "Une sélection personnelle des moments préférés du studio.", es: "Una selección personal de momentos favoritos del estudio.",
      it: "Una selezione personale dei momenti preferiti in studio.", nl: "Een persoonlijke selectie van favoriete momenten uit de studio.",
      pl: "Osobisty wybór ulubionych chwil ze studia.", pt: "Uma seleção pessoal de momentos favoritos do estúdio.",
    }),
  },
];

export const DEMO_RELEASES: { slug: string; days: number | null; image: string; tr: Tr }[] = [
  {
    slug: "winter-velvet", days: 21, image: "release-1",
    tr: {
      en: ["Winter Velvet", "Deep espresso velvet and candlelight — a new collection for the cold season."],
      de: ["Winter Velvet", "Tiefer Espresso-Samt und Kerzenlicht — eine neue Kollektion für die kalte Jahreszeit."],
      fr: ["Velours d'Hiver", "Velours espresso profond et lueur de bougie — une nouvelle collection pour la saison froide."],
      es: ["Terciopelo de Invierno", "Terciopelo espresso y luz de velas: una nueva colección para la estación fría."],
      it: ["Velluto d'Inverno", "Velluto espresso profondo e luce di candela — una nuova collezione per la stagione fredda."],
      nl: ["Wintervelours", "Diep espressofluweel en kaarslicht — een nieuwe collectie voor het koude seizoen."],
      pl: ["Zimowy Aksamit", "Głęboki aksamit w odcieniu espresso i blask świec — nowa kolekcja na zimę."],
      pt: ["Veludo de Inverno", "Veludo espresso profundo e luz de velas — uma nova coleção para a estação fria."],
    },
  },
  {
    slug: "rouge-season", days: null, image: "release-2",
    tr: {
      en: ["Rouge Season", "A study in cherry and bordeaux lacquer — new nail polish themes."],
      de: ["Rouge Season", "Eine Studie in Kirsch- und Bordeauxlack — neue Nagellack-Themen."],
      fr: ["Saison Rouge", "Une étude en laque cerise et bordeaux — de nouveaux thèmes de vernis."],
      es: ["Temporada Rouge", "Un estudio en esmalte cereza y burdeos: nuevos temas de color."],
      it: ["Stagione Rouge", "Uno studio in smalto ciliegia e bordeaux — nuovi temi di colore."],
      nl: ["Rouge Seizoen", "Een studie in kers- en bordeauxlak — nieuwe nagellakthema's."],
      pl: ["Sezon Rouge", "Studium wiśniowego i bordowego lakieru — nowe motywy kolorystyczne."],
      pt: ["Estação Rouge", "Um estudo em verniz cereja e bordeaux — novos temas de cor."],
    },
  },
  {
    slug: "studio-diaries", days: null, image: "release-3",
    tr: {
      en: ["Studio Diaries", "Behind-the-scenes moments from the studio, in silent photographs."],
      de: ["Studio-Tagebuch", "Momente hinter den Kulissen des Studios, in stillen Fotografien."],
      fr: ["Carnets d'Atelier", "Des moments en coulisses du studio, en photographies silencieuses."],
      es: ["Diarios del Estudio", "Momentos entre bastidores del estudio, en fotografías silenciosas."],
      it: ["Diari dello Studio", "Momenti dietro le quinte dello studio, in fotografie silenziose."],
      nl: ["Studiodagboek", "Momenten achter de schermen van de studio, in stille foto's."],
      pl: ["Dziennik Studia", "Chwile zza kulis studia w cichych fotografiach."],
      pt: ["Diários do Estúdio", "Momentos dos bastidores do estúdio, em fotografias silenciosas."],
    },
  },
];
