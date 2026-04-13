import mongoose , {Document, Schema} from 'mongoose'


export interface IQuestion extends Document{
    text:string;
    type: 'truth'|'dare'
}

const QuestionSchema = new Schema<IQuestion>({
    text: {type:String,required:true},
    type: {type:String,enum:['truth','dare'],required:true}
})

const Question = mongoose.model<IQuestion>('Question',QuestionSchema)
export default Question  