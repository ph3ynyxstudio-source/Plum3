export const NARRATIVE_GENRES = [
  "Science-fiction",
  "Fantasy",
  "Thriller",
  "Romance",
  "Mystère",
  "Horreur",
  "Historique",
  "Post-apocalyptique",
  "Cyberpunk",
  "Autre",
] as const;

export type TemplateCategory = "Général" | "Écriture narrative" | "Composition" | "Publication" | "Univers et worldbuilding";

export interface WritingTemplate {
  id: string;
  name: string;
  shortName?: string;
  category: TemplateCategory;
  symbol: string;
  narrative?: boolean;
  content: string;
}

const sections = (title: string, headings: string[]): string =>
  [`# ${title}`, "", ...headings.flatMap((heading) => [`## ${heading}`, ""])].join("\n").trimEnd() + "\n";

export const WRITING_TEMPLATES: WritingTemplate[] = [
  { id: "blank", name: "Document vide", category: "Général", symbol: "＋", content: "" },
  { id: "novel", name: "Roman", category: "Écriture narrative", symbol: "📖", narrative: true, content: sections("Titre du roman", ["Informations générales", "Genre", "État d’avancement", "Résumé", "Personnages principaux", "Univers", "Plan narratif", "Chapitres", "Notes générales"]) },
  { id: "short-story", name: "Nouvelle", category: "Écriture narrative", symbol: "✦", narrative: true, content: sections("Titre de la nouvelle", ["Informations générales", "Genre", "État d’avancement", "Idée principale", "Résumé", "Personnages", "Début", "Développement", "Fin", "Notes"]) },
  { id: "screenplay", name: "Scénario", category: "Écriture narrative", symbol: "🎬", narrative: true, content: sections("Titre du scénario", ["Genre", "Format", "État d’avancement", "Synopsis", "Personnages", "Actes", "Scènes", "Lieu", "Moment", "Personnages présents", "Description", "Dialogue", "Notes"]) },
  { id: "webtoon", name: "Webtoon", category: "Écriture narrative", symbol: "▤", narrative: true, content: sections("Titre du webtoon", ["Genre", "État d’avancement", "Concept", "Résumé général", "Personnages", "Saisons", "Épisodes", "Scènes", "Dialogues", "Notes visuelles", "Notes générales"]) },
  { id: "narrative-outline", name: "Plan narratif", category: "Écriture narrative", symbol: "☷", narrative: true, content: sections("Nom du projet", ["Format", "Genre", "État d’avancement", "Résumé général", "Actes ou saisons", "Chapitres ou épisodes", "Résumé de chaque partie", "Objectif narratif", "Progression générale", "Notes"]) },
  { id: "song", name: "Composition de chanson", shortName: "Chanson", category: "Composition", symbol: "♫", content: sections("Titre de la chanson", ["Intention", "Couplet 1", "Refrain", "Couplet 2", "Refrain", "Pont optionnel", "Notes de composition", "Tonalité", "Tempo", "Ambiance", "Références"]) },
  { id: "social-post", name: "Publication réseau social", category: "Publication", symbol: "◎", content: sections("Sujet du post", ["Objectif", "Plateforme\n\nLinkedIn / Instagram / Facebook / Autre", "Message principal", "Accroche", "Corps du post", "Conclusion ou appel à l’action", "Hashtags", "Visuel associé", "Notes"]) },
  { id: "world", name: "Univers / Worldbuilding", category: "Univers et worldbuilding", symbol: "◉", content: sections("Nom de l’univers", ["Concept général", "Résumé", "Règles du monde", "Géographie", "Sociétés et cultures", "Organisations", "Technologies ou magie", "Créatures", "Histoire", "Conflits principaux", "Notes"]) },
  { id: "character", name: "Fiche personnage", category: "Univers et worldbuilding", symbol: "♙", content: sections("Nom du personnage", ["Âge", "Rôle", "Apparence", "Personnalité", "Objectifs", "Motivations", "Peurs", "Forces", "Faiblesses", "Relations", "Passé", "Évolution", "Notes"]) },
  { id: "place", name: "Lieu", category: "Univers et worldbuilding", symbol: "⌖", content: sections("Nom du lieu", ["Type de lieu", "Description", "Localisation", "Atmosphère", "Habitants", "Fonction dans l’histoire", "Événements importants", "Notes"]) },
  { id: "region", name: "Région", category: "Univers et worldbuilding", symbol: "◇", content: sections("Nom de la région", ["Description générale", "Géographie", "Climat", "Population", "Culture", "Ressources", "Lieux importants", "Conflits", "Notes"]) },
  { id: "object", name: "Objet", category: "Univers et worldbuilding", symbol: "◆", content: sections("Nom de l’objet", ["Description", "Origine", "Fonction", "Propriétés", "Limites", "Propriétaire", "Importance dans l’histoire", "Notes"]) },
  { id: "organization", name: "Organisation", category: "Univers et worldbuilding", symbol: "△", content: sections("Nom de l’organisation", ["Description", "Objectif", "Origine", "Structure", "Membres importants", "Ressources", "Alliés", "Adversaires", "Rôle dans l’histoire", "Notes"]) },
  { id: "technology", name: "Technologie", category: "Univers et worldbuilding", symbol: "⚙", content: sections("Nom de la technologie", ["Description", "Fonctionnement", "Origine", "Utilisations", "Limites", "Risques", "Impact sur le monde", "Notes"]) },
  { id: "creature", name: "Créature", category: "Univers et worldbuilding", symbol: "♢", content: sections("Nom de la créature", ["Description", "Apparence", "Habitat", "Comportement", "Capacités", "Faiblesses", "Origine", "Rôle dans l’univers", "Notes"]) },
  { id: "historical-event", name: "Événement historique", category: "Univers et worldbuilding", symbol: "⌛", content: sections("Nom de l’événement", ["Date ou période", "Résumé", "Contexte", "Personnes ou groupes impliqués", "Déroulement", "Conséquences", "Impact actuel", "Notes"]) },
];

export function buildTemplateContent(template: WritingTemplate, genre: string): string {
  if (!template.narrative || !genre) return template.content;
  return template.content.replace("## Genre\n", `## Genre\n\n${genre}\n`);
}

export function templateDocumentName(template: WritingTemplate): string {
  if (template.id === "blank") return "Sans titre.md";
  const portableName = template.name.replace(/[\\/:*?"<>|]/gu, " - ");
  return `${portableName}.md`;
}
