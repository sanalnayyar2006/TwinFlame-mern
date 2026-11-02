import mongoose, { Document, Schema } from 'mongoose'

export interface IGallery extends Document {
    author: mongoose.Types.ObjectId
    coupleId: string
    imageUrl: string
    publicId: string
    caption?: string
}

const GallerySchema = new Schema<IGallery>(
    {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        coupleId: { type: String, required: true },
        imageUrl: { type: String, required: true },
        publicId: { type: String, required: true },
        caption: { type: String }
    },
    { timestamps: true }
)

// Every list query filters by couple and pages newest first
GallerySchema.index({ coupleId: 1, _id: -1 })

const Gallery = mongoose.model<IGallery>('Gallery', GallerySchema)
export default Gallery