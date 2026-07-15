import type { Locale } from "../i18n/i18n";

export type LocalizedText = Record<Locale, string>;

export const NARRATIVE_GENRES = [
  { id: "science-fiction", label: { fr: "Science-fiction", en: "Science fiction" } },
  { id: "fantasy", label: { fr: "Fantasy", en: "Fantasy" } },
  { id: "thriller", label: { fr: "Thriller", en: "Thriller" } },
  { id: "romance", label: { fr: "Romance", en: "Romance" } },
  { id: "mystery", label: { fr: "Mystère", en: "Mystery" } },
  { id: "horror", label: { fr: "Horreur", en: "Horror" } },
  { id: "historical", label: { fr: "Historique", en: "Historical" } },
  { id: "post-apocalyptic", label: { fr: "Post-apocalyptique", en: "Post-apocalyptic" } },
  { id: "cyberpunk", label: { fr: "Cyberpunk", en: "Cyberpunk" } },
  { id: "other", label: { fr: "Autre", en: "Other" } },
] as const;

export type NarrativeGenreId = (typeof NARRATIVE_GENRES)[number]["id"];
export type TemplateCategory = "Général" | "Écriture narrative" | "Composition" | "Publication" | "Univers et worldbuilding";

export interface WritingTemplate {
  id: string;
  name: string;
  shortName?: string;
  category: TemplateCategory;
  symbol: string;
  narrative?: boolean;
  content: LocalizedText;
}

const sections = (title: string, headings: string[]): string =>
  [`# ${title}`, "", ...headings.flatMap((heading) => [`## ${heading}`, ""])].join("\n").trimEnd() + "\n";

const localizedSections = (
  fr: { title: string; headings: string[] },
  en: { title: string; headings: string[] },
): LocalizedText => ({
  fr: sections(fr.title, fr.headings),
  en: sections(en.title, en.headings),
});

export const WRITING_TEMPLATES: WritingTemplate[] = [
  { id: "blank", name: "Document vide", category: "Général", symbol: "＋", content: { fr: "", en: "" } },
  {
    id: "novel", name: "Roman", category: "Écriture narrative", symbol: "📖", narrative: true,
    content: localizedSections(
      { title: "Titre du roman", headings: ["Informations générales", "Genre", "État d’avancement", "Résumé", "Personnages principaux", "Univers", "Plan narratif", "Chapitres", "Notes générales"] },
      { title: "Novel Title", headings: ["General Information", "Genre", "Progress", "Summary", "Main Characters", "World", "Story Outline", "Chapters", "General Notes"] },
    ),
  },
  {
    id: "short-story", name: "Nouvelle", category: "Écriture narrative", symbol: "✦", narrative: true,
    content: localizedSections(
      { title: "Titre de la nouvelle", headings: ["Informations générales", "Genre", "État d’avancement", "Idée principale", "Résumé", "Personnages", "Début", "Développement", "Fin", "Notes"] },
      { title: "Short Story Title", headings: ["General Information", "Genre", "Progress", "Core Idea", "Summary", "Characters", "Opening", "Development", "Ending", "Notes"] },
    ),
  },
  {
    id: "screenplay", name: "Scénario", category: "Écriture narrative", symbol: "🎬", narrative: true,
    content: localizedSections(
      { title: "Titre du scénario", headings: ["Genre", "Format", "État d’avancement", "Synopsis", "Personnages", "Actes", "Scènes", "Lieu", "Moment", "Personnages présents", "Description", "Dialogue", "Notes"] },
      { title: "Screenplay Title", headings: ["Genre", "Format", "Progress", "Synopsis", "Characters", "Acts", "Scenes", "Location", "Time", "Characters Present", "Description", "Dialogue", "Notes"] },
    ),
  },
  {
    id: "webtoon", name: "Webtoon", category: "Écriture narrative", symbol: "▤", narrative: true,
    content: localizedSections(
      { title: "Titre du webtoon", headings: ["Genre", "État d’avancement", "Concept", "Résumé général", "Personnages", "Saisons", "Épisodes", "Scènes", "Dialogues", "Notes visuelles", "Notes générales"] },
      { title: "Webtoon Title", headings: ["Genre", "Progress", "Concept", "Overall Summary", "Characters", "Seasons", "Episodes", "Scenes", "Dialogue", "Visual Notes", "General Notes"] },
    ),
  },
  {
    id: "narrative-outline", name: "Plan narratif", category: "Écriture narrative", symbol: "☷", narrative: true,
    content: localizedSections(
      { title: "Nom du projet", headings: ["Format", "Genre", "État d’avancement", "Résumé général", "Actes ou saisons", "Chapitres ou épisodes", "Résumé de chaque partie", "Objectif narratif", "Progression générale", "Notes"] },
      { title: "Project Name", headings: ["Format", "Genre", "Progress", "Overall Summary", "Acts or Seasons", "Chapters or Episodes", "Section Summaries", "Story Goal", "Overall Progression", "Notes"] },
    ),
  },
  {
    id: "song", name: "Composition de chanson", shortName: "Chanson", category: "Composition", symbol: "♫",
    content: localizedSections(
      { title: "Titre de la chanson", headings: ["Intention", "Couplet 1", "Refrain", "Couplet 2", "Refrain", "Pont optionnel", "Notes de composition", "Tonalité", "Tempo", "Ambiance", "Références"] },
      { title: "Song Title", headings: ["Intent", "Verse 1", "Chorus", "Verse 2", "Chorus", "Optional Bridge", "Composition Notes", "Key", "Tempo", "Mood", "References"] },
    ),
  },
  {
    id: "social-post", name: "Publication réseau social", category: "Publication", symbol: "◎",
    content: localizedSections(
      { title: "Sujet du post", headings: ["Objectif", "Plateforme\n\nLinkedIn / Instagram / Facebook / Autre", "Message principal", "Accroche", "Corps du post", "Conclusion ou appel à l’action", "Hashtags", "Visuel associé", "Notes"] },
      { title: "Post Topic", headings: ["Goal", "Platform\n\nLinkedIn / Instagram / Facebook / Other", "Main Message", "Hook", "Post Body", "Conclusion or Call to Action", "Hashtags", "Supporting Visual", "Notes"] },
    ),
  },
  {
    id: "world", name: "Univers / Worldbuilding", category: "Univers et worldbuilding", symbol: "◉",
    content: localizedSections(
      { title: "Nom de l’univers", headings: ["Concept général", "Résumé", "Règles du monde", "Géographie", "Sociétés et cultures", "Organisations", "Technologies ou magie", "Créatures", "Histoire", "Conflits principaux", "Notes"] },
      { title: "World Name", headings: ["Core Concept", "Overview", "World Rules", "Geography", "Societies and Cultures", "Organizations", "Technology or Magic", "Creatures", "History", "Main Conflicts", "Notes"] },
    ),
  },
  {
    id: "character", name: "Fiche personnage", category: "Univers et worldbuilding", symbol: "♙",
    content: localizedSections(
      { title: "Nom du personnage", headings: ["Âge", "Rôle", "Apparence", "Personnalité", "Objectifs", "Motivations", "Peurs", "Forces", "Faiblesses", "Relations", "Passé", "Évolution", "Notes"] },
      { title: "Character Name", headings: ["Age", "Role", "Appearance", "Personality", "Goals", "Motivations", "Fears", "Strengths", "Weaknesses", "Relationships", "Backstory", "Character Arc", "Notes"] },
    ),
  },
  {
    id: "place", name: "Lieu", category: "Univers et worldbuilding", symbol: "⌖",
    content: localizedSections(
      { title: "Nom du lieu", headings: ["Type de lieu", "Description", "Localisation", "Atmosphère", "Habitants", "Fonction dans l’histoire", "Événements importants", "Notes"] },
      { title: "Place Name", headings: ["Type of Place", "Description", "Location", "Atmosphere", "Inhabitants", "Role in the Story", "Important Events", "Notes"] },
    ),
  },
  {
    id: "region", name: "Région", category: "Univers et worldbuilding", symbol: "◇",
    content: localizedSections(
      { title: "Nom de la région", headings: ["Description générale", "Géographie", "Climat", "Population", "Culture", "Ressources", "Lieux importants", "Conflits", "Notes"] },
      { title: "Region Name", headings: ["Overview", "Geography", "Climate", "Population", "Culture", "Resources", "Important Places", "Conflicts", "Notes"] },
    ),
  },
  {
    id: "object", name: "Objet", category: "Univers et worldbuilding", symbol: "◆",
    content: localizedSections(
      { title: "Nom de l’objet", headings: ["Description", "Origine", "Fonction", "Propriétés", "Limites", "Propriétaire", "Importance dans l’histoire", "Notes"] },
      { title: "Object Name", headings: ["Description", "Origin", "Purpose", "Properties", "Limitations", "Owner", "Importance to the Story", "Notes"] },
    ),
  },
  {
    id: "organization", name: "Organisation", category: "Univers et worldbuilding", symbol: "△",
    content: localizedSections(
      { title: "Nom de l’organisation", headings: ["Description", "Objectif", "Origine", "Structure", "Membres importants", "Ressources", "Alliés", "Adversaires", "Rôle dans l’histoire", "Notes"] },
      { title: "Organization Name", headings: ["Description", "Goal", "Origin", "Structure", "Key Members", "Resources", "Allies", "Adversaries", "Role in the Story", "Notes"] },
    ),
  },
  {
    id: "technology", name: "Technologie", category: "Univers et worldbuilding", symbol: "⚙",
    content: localizedSections(
      { title: "Nom de la technologie", headings: ["Description", "Fonctionnement", "Origine", "Utilisations", "Limites", "Risques", "Impact sur le monde", "Notes"] },
      { title: "Technology Name", headings: ["Description", "How It Works", "Origin", "Uses", "Limitations", "Risks", "Impact on the World", "Notes"] },
    ),
  },
  {
    id: "creature", name: "Créature", category: "Univers et worldbuilding", symbol: "♢",
    content: localizedSections(
      { title: "Nom de la créature", headings: ["Description", "Apparence", "Habitat", "Comportement", "Capacités", "Faiblesses", "Origine", "Rôle dans l’univers", "Notes"] },
      { title: "Creature Name", headings: ["Description", "Appearance", "Habitat", "Behavior", "Abilities", "Weaknesses", "Origin", "Role in the World", "Notes"] },
    ),
  },
  {
    id: "historical-event", name: "Événement historique", category: "Univers et worldbuilding", symbol: "⌛",
    content: localizedSections(
      { title: "Nom de l’événement", headings: ["Date ou période", "Résumé", "Contexte", "Personnes ou groupes impliqués", "Déroulement", "Conséquences", "Impact actuel", "Notes"] },
      { title: "Event Name", headings: ["Date or Period", "Summary", "Context", "People or Groups Involved", "Course of Events", "Consequences", "Present-Day Impact", "Notes"] },
    ),
  },
];

export function buildTemplateContent(
  template: WritingTemplate,
  genreId: NarrativeGenreId | "",
  locale: Locale,
): string {
  const content = template.content[locale];
  if (!template.narrative || !genreId) return content;
  const genre = NARRATIVE_GENRES.find(({ id }) => id === genreId);
  if (!genre) return content;
  return content.replace("## Genre\n", `## Genre\n\n${genre.label[locale]}\n`);
}

export function templateDocumentName(template: WritingTemplate): string {
  if (template.id === "blank") return "Sans titre.md";
  const portableName = template.name.replace(/[\\/:*?"<>|]/gu, " - ");
  return `${portableName}.md`;
}
