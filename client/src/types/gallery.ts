export interface GalleryImage {
  _id: string
  imageUrl: string
  caption?: string
  createdAt: string
  author?: {
    _id: string
    name: string
  }
}
