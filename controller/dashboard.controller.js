const FileModel = require("../model/files.model");
const mongoose = require("mongoose");

const fetchDashboard = async(req,res) => {
     try {
        const data = await FileModel.aggregate([
               // BUG FIX: Filter by logged-in user so each user only sees their own file stats
               {
                    $match: { user: new mongoose.Types.ObjectId(req.user.id) }
               },
               {
                    $group: {
                         _id: "$type",
                         total:{$sum:1}
                    }
               }
        ])
          res.status(200).json({data})
      
     } catch (err) {
          res.status(500).json({message:err.message})
}
}

module.exports = {
     fetchDashboard
}
