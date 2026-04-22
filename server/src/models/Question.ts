import mongoose , {Document, Schema} from 'mongoose'


export interface IQuestion extends Document{
    text:string;
    category: 'truth'|'dare'
}

const QuestionSchema = new Schema<IQuestion>({
    text: {type:String,required:true},
    category: {type:String,enum:['truth','dare'],required:true}
})

const Question = mongoose.model<IQuestion>('Question',QuestionSchema)
export default Question  