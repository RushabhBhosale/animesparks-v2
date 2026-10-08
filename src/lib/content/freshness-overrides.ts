import type { ArticleCard, ArticleDocument } from './types';

type PublicArticle = ArticleDocument | ArticleCard;

/** Build-time copy corrections for dated release announcements. This keeps the
 * production render current without writing to MongoDB or changing URLs/dates. */
export function applyFreshnessOverride<T extends PublicArticle>(article: T): T {
  if (article.slug === 'blue-box-season-2-release-date-netflix') {
    const replace = (value: string) => value
      .replaceAll('Blue Box Season 2 premieres October 4, 2026.', 'Blue Box Season 2 began weekly streaming on Netflix on October 4, 2026.')
      .replaceAll('Blue Box Season 2 premieres in Japan on October 4, 2026', 'Blue Box Season 2 premiered in Japan on October 4, 2026')
      .replaceAll('Blue Box Season 2 starts Sunday, October 4, 2026', 'Blue Box Season 2 premiered Sunday, October 4, 2026')
      .replaceAll('When does Blue Box Season 2 come out?', 'When did Blue Box Season 2 premiere?')
      .replaceAll('Season 2 arrives at a point', 'Season 2 returns at a point');
    return {
      ...article,
      metaDescription: replace(article.metaDescription || ''),
      excerpt: replace(article.excerpt || ''),
      body: article.body?.map(block => ({
        ...block,
        children: block.children?.map(span => ({ ...span, text: replace(span.text || '') })),
      })),
      faq: article.faq?.map(item => ({
        ...item,
        question: replace(item.question || ''),
        answer: replace(item.answer || ''),
      })),
    } as T;
  }

  if (article.slug === 'ranma-1-2-season-3-release-date-netflix-cast') {
    const replace = (value: string) => value
      .replaceAll('Ranma 1/2 Season 3 premieres October 3, 2026.', 'Ranma 1/2 Season 3 was scheduled to premiere on Netflix on October 3, 2026.')
      .replaceAll('Ranma 1/2 Season 3 premieres on October 3, 2026', 'Ranma 1/2 Season 3 was scheduled to premiere on October 3, 2026')
      .replaceAll('Ranma 1/2 Season 3 starts on October 3, 2026', 'Ranma 1/2 Season 3 was scheduled to start on October 3, 2026')
      .replaceAll('Ranma 1/2 Season 3 returns October 3, 2026', 'Ranma 1/2 Season 3 was scheduled to return on October 3, 2026')
      .replaceAll('When does Ranma 1/2 Season 3 release?', 'When was Ranma 1/2 Season 3 scheduled to premiere?')
      .replaceAll('When does Ranma 1/2 Season 3 come out?', 'When was Ranma 1/2 Season 3 scheduled to premiere?');
    return {
      ...article,
      metaDescription: replace(article.metaDescription || ''),
      excerpt: replace(article.excerpt || ''),
      body: article.body?.map(block => ({
        ...block,
        children: block.children?.map(span => ({ ...span, text: replace(span.text || '') })),
      })),
      faq: article.faq?.map(item => ({
        ...item,
        question: replace(item.question || ''),
        answer: replace(item.answer || ''),
      })),
    } as T;
  }

  if (article.slug === 'one-piece-episode-1180-release-date-2026-hiatus') {
    const replace = (value: string) => value
      .replaceAll('One Piece Episode 1180 airs September 27, 2026 and closes the anime’s 2026 television run.', 'One Piece Episode 1180 aired in Japan on September 27, 2026, the scheduled final episode of the anime’s 2026 television run.')
      .replaceAll('One Piece Episode 1180 airs September 27 and ends the anime’s 2026 run.', 'One Piece Episode 1180 aired in Japan on September 27, 2026, the scheduled final episode of the anime’s 2026 run.')
      .replaceAll('One Piece Episode 1180 airs on September 27, 2026', 'One Piece Episode 1180 aired in Japan on September 27, 2026')
      .replaceAll('One Piece Episode 1180 is scheduled to air in Japan on September 27, 2026.', 'One Piece Episode 1180 aired in Japan on September 27, 2026.')
      .replaceAll('Episode 1180 is scheduled for Sunday, September 27, 2026 in Japan.', 'Episode 1180 aired in Japan on Sunday, September 27, 2026.')
      .replaceAll('One Piece Episode 1180 releases September 27, 2026 in Japan', 'One Piece Episode 1180 aired in Japan on September 27, 2026')
      .replaceAll('When does One Piece Episode 1180 release?', 'When did One Piece Episode 1180 air?')
      .replaceAll('The anime is entering another planned break', 'The anime then entered another planned break')
      .replaceAll('Episode 1180 now marks the next major stopping point', 'Episode 1180 marked the next major stopping point')
      .replaceAll('Episode 1180 is the final One Piece TV episode of 2026', 'Episode 1180 was the scheduled final One Piece TV episode of 2026')
      .replaceAll('Episode 1180 is the end of One Piece’s 2026 anime run', 'Episode 1180 was the scheduled end of One Piece’s 2026 anime run')
      .replaceAll('Episode 1180 closes the 2026 television run', 'Episode 1180 closed the scheduled 2026 television run')
      .replaceAll('The most useful confirmed information right now is simply', 'The key confirmed information is');
    return {
      ...article,
      metaDescription: replace(article.metaDescription || ''),
      excerpt: replace(article.excerpt || ''),
      body: article.body?.map(block => ({
        ...block,
        children: block.children?.map(span => ({ ...span, text: replace(span.text || '') })),
      })),
      faq: article.faq?.map(item => ({
        ...item,
        question: replace(item.question || ''),
        answer: replace(item.answer || ''),
      })),
    } as T;
  }

  return article;
}
