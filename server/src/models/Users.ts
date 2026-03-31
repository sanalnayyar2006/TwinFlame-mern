import mongoose, {Document,Schema} from 'mongoose'

interface IUser extends Document{
    id:string;
    name:string;
    email:string;
    password:string;
    coupleCode:string;
    partnerId?:mongoose.Types.ObjectId;
    createdAt:Date
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true, minlength: 6 },
        coupleCode: { type: String, required: true, unique: true },
        partnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    {timestamps:true}
)

const User = mongoose.model<IUser>('User',UserSchema)
export default User