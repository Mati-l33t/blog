import { groupBy } from 'lodash-es'
import { createContentLoader, type ContentData } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: string // YYYY-MM-DD
  tags: string[]
}

// `@types/lodash-es` does not export `Dictionary` type definition.
type Dictionary = ReturnType<typeof transformRawPosts>

declare const data: Dictionary
// Sorted.
export { data }

const extractTitle = (markdown: string): string => {
  const match = markdown.match(/^# (.*)$/m)
  return match ? match[1]! : 'Not Found Title in Markdown'
}

const formatURL = (url: string): string => {
  return url.replace(/\/\d+\./, '/')
}

const transformRawPosts = (rawPosts: ContentData[]) => {
  const posts: Post[] = rawPosts
    .map((post) => {
      const { title, date, tags } = post.frontmatter
      // if (title?.trim()) {
      //   post.src = `# ${title.trim()}\n\n${post.src}`
      // }
      return {
        title: title?.trim() || extractTitle(post.src!),
        url: formatURL(post.url),
        date: date instanceof Date ? date.toISOString().slice(0, 10) : "N/A",
        tags: tags?.map((t: string) => t.trim()) ?? ['no-tags'],
        src: `# ${title.trim()}\n\n${post.src}`
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return groupBy(posts, (post) => post.date.slice(0, 4))
}

export default createContentLoader('blog/*.md', {
  includeSrc: true,
  // The raw will not contain any pages that begin with dot, such as `.example.md`.
  transform: (raw) => transformRawPosts(raw),
})

