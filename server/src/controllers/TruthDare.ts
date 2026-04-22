import { Response } from 'express'
import Question from '../models/Question'
import { AuthRequest } from '../middleware/auth'

//GET Random questions by category

export const getQuestion = async (req:AuthRequest,res:Response):Promise<void>=>{
    try{
        const {category} = req.query

        if(category !== 'truth' && category !== 'dare'){
            res.status(400).json({message:"Category must be truth or dare"})
            return
        }

         // Count total questions of this category
        const count = await Question.countDocuments({ category })

        // Pick a random index
        const random = Math.floor(Math.random() * count)

        // Fetch one question at random index
        const question = await Question.findOne({ category }).skip(random)

        res.status(200).json({ question })
    }catch (error) {
    res.status(500).json({ message: 'Server error' })
    }
}   