export type PublicLocale = 'en' | 'es';

const ui = {
  en: {
    home: 'Home', categories: 'Categories', latest: 'Latest', trending: 'Trending',
    searchLabel: 'Search AnimeSparks', searchPlaceholder: 'Search series, articles...', searchSubmit: 'Submit search',
    openMenu: 'Open menu', closeMenu: 'Close menu', openSearch: 'Open search',
    mainNav: 'Main navigation', footerExplore: 'Footer explore', publication: 'Publication',
    explore: 'Explore', allArticles: 'All blogs', editorialSections: 'Editorial sections',
    trendingNow: 'Trending now', myAnimeList: 'My anime list', spanishEdition: 'Spanish edition',
    readInEnglish: 'Read in English', readInSpanish: 'Leer en Español',
    latestStories: 'Latest Stories', popularThisWeek: 'Popular this week',
    selectedReading: 'Selected Reading', archive: 'Explore the archive', viewAll: 'View all',
    browseArchive: 'Browse full archive', readStory: 'Read the story',
    searchArticles: 'Search articles', searchTopic: 'Search a topic or series', search: 'Search',
    articleOrder: 'Article order', allArticlesFilter: 'All blogs', newest: 'Newest first', popular: 'Popular',
    articles: 'blogs', timeRange: 'Time range', discussed: 'Discussed', visual: 'Visual',
    noArticles: 'No articles found matching your criteria.', previous: 'Previous', next: 'Next', pagination: 'Pagination',
    furtherReading: 'Further reading', exploreTopic: 'Explore a topic', editions: 'Editions',
    chooseLanguage: 'Read in your language', englishEdition: 'English Edition', spanishEditionLabel: 'Spanish Edition',
    breadcrumb: 'Breadcrumb', languageEditions: 'Language editions', blogs: 'Blogs',
    share: 'Share', copy: 'Copy link', copied: 'Copied', contents: 'In this article', author: 'About the author',
    tags: 'Filed under', faq: 'Frequently asked questions', sources: 'Sources & references', related: 'Related Articles',
    read: 'min read', readMore: 'Read more',
  },
  es: {
    home: 'Inicio', categories: 'Categorías', latest: 'Últimos artículos', trending: 'Tendencias',
    searchLabel: 'Buscar en AnimeSparks', searchPlaceholder: 'Busca series y artículos...', searchSubmit: 'Enviar búsqueda',
    openMenu: 'Abrir menú', closeMenu: 'Cerrar menú', openSearch: 'Abrir búsqueda',
    mainNav: 'Navegación principal', footerExplore: 'Explorar el pie de página', publication: 'Publicación',
    explore: 'Explorar', allArticles: 'Todos los artículos', editorialSections: 'Secciones editoriales',
    trendingNow: 'Tendencias actuales', myAnimeList: 'Mi lista de anime', spanishEdition: 'Edición en español',
    readInEnglish: 'Leer en inglés', readInSpanish: 'Leer en español',
    latestStories: 'Últimas noticias', popularThisWeek: 'Más leídos esta semana',
    selectedReading: 'Selección editorial', archive: 'Explorar el archivo', viewAll: 'Ver todos',
    browseArchive: 'Explorar el archivo completo', readStory: 'Leer el artículo',
    searchArticles: 'Buscar artículos', searchTopic: 'Busca un tema o una serie', search: 'Buscar',
    articleOrder: 'Orden de los artículos', allArticlesFilter: 'Todos los artículos', newest: 'Más recientes', popular: 'Populares',
    articles: 'artículos', timeRange: 'Período', discussed: 'Más comentados', visual: 'Visuales',
    noArticles: 'No se encontraron artículos.', previous: 'Anterior', next: 'Siguiente', pagination: 'Paginación',
    furtherReading: 'Para seguir leyendo', exploreTopic: 'Explora un tema', editions: 'Ediciones',
    chooseLanguage: 'Elige tu idioma', englishEdition: 'Edición en inglés', spanishEditionLabel: 'Edición en español',
    breadcrumb: 'Ruta de navegación', languageEditions: 'Ediciones por idioma', blogs: 'Artículos',
    share: 'Compartir', copy: 'Copiar enlace', copied: 'Copiado', contents: 'En este artículo', author: 'Sobre el autor',
    tags: 'Etiquetas', faq: 'Preguntas frecuentes', sources: 'Fuentes y referencias', related: 'Artículos relacionados',
    read: 'min de lectura', readMore: 'Leer más',
  },
} as const;

export function getUiCopy(locale: PublicLocale = 'en') {
  return ui[locale];
}

const categoriesEs: Record<string, string> = {
  'anime reviews': 'Reseñas de anime',
  'anime opinions': 'Opiniones sobre anime',
  'anime opinions & hot takes that go deeper': 'Opiniones y análisis de anime',
  'anime lists': 'Listas de anime',
  'anime news': 'Noticias de anime',
  'anime news & updates': 'Noticias y novedades de anime',
  'kdrama': 'Dramas coreanos',
  'tv series': 'Series de televisión',
  'tv-series': 'Series de televisión',
};

export function categoryLabel(title: string, locale: PublicLocale = 'en') {
  return locale === 'es' ? categoriesEs[title.trim().toLocaleLowerCase('es')] || title : title;
}

const articleTypesEs: Record<string, string> = {
  news: 'Noticias', review: 'Reseña', analysis: 'Análisis', opinion: 'Opinión',
  list: 'Lista', guide: 'Guía', explanation: 'Explicación', 'character study': 'Estudio de personajes',
};

export function articleTypeLabel(value: string, locale: PublicLocale = 'en') {
  const normalized = value.replaceAll('-', ' ').trim();
  return locale === 'es' ? articleTypesEs[normalized.toLocaleLowerCase('es')] || normalized : normalized;
}
