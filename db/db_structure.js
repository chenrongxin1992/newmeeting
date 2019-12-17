/**
 *  @Author:    chenrongxin
 *  @Create Date:   2019-6-1
 *  @Description:   题目类别表
 */

    const mongoose = require('mongoose')
    mongoose.Promise = global.Promise;
    //服务器上
    const DB_URL = 'mongodb://newmeeting:youtrytry@localhost:27017/newmeeting'
    //本地
    //const DB_URL = 'mongodb://localhost:27017/dxxxhjs'
    mongoose.connect(DB_URL,{useNewUrlParser:true,useUnifiedTopology: true})//{ useUnifiedTopology: true }

    /**
      * 连接成功
      */
    mongoose.connection.on('connected', function () {    
        console.log('Mongoose connection open to ' + DB_URL);  
    });    

    /**
     * 连接异常
     */
    mongoose.connection.on('error',function (err) {    
        console.log('Mongoose connection error: ' + err);  
    });    
     
    /**
     * 连接断开
     */
    mongoose.connection.on('disconnected', function () {    
        console.log('Mongoose connection disconnected');  
    });   

//var mongoose = require('./db'),
    let Schema = mongoose.Schema,
    moment = require('moment')

//用户
var meetingSchema = new Schema({ 
    room_name :{type:String},
    title : {type:String},//主题
    num : {type:Number},//人数
    start : {type:String},//开始时间
    end : {type:String},//结束时间
    date : {type:String},//日期
    fuzeren : {type:String},//负责人
    phone : {type:String},
    applyname : {type:String},
    applytime : {type:String,default:moment().format('YYYY-MM-DD HH:mm')},
    applytimestamp : {type:String,default:moment().format('X')},
    date_timestamp : {type:String},//日期时间戳
    isok : {type:Number,default:0}//是否批准 0否 1准
},{collection:'meeting'})

exports.meeting = mongoose.model('meeting',meetingSchema)
