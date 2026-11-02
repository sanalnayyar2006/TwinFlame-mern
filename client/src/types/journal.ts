export interface JournalAuthor {
  _id: string
  name: string
}

export interface JournalEntry {
  _id: string
  title: string
  content: string
  author: JournalAuthor
  createdAt: string
  imageUrl?: string
}
