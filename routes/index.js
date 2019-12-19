var express = require('express');
var router = express.Router();

const moment = require('moment')
const meeting = require('../db/db_structure').meeting//用户排序

const request = require('request')
const async = require('async')

const MyServer = "http://qiandao.szu.edu.cn:81",
	//CASserver = "https://auth.szu.edu.cn/cas.aspx/",
	CASserver = 'https://authserver.szu.edu.cn/authserver/',
	ReturnURL = "http://qiandao.szu.edu.cn:81";

//正则匹配
function pipei(str,arg){
	let zhengze = '<cas:' + arg + '>(.*)<\/cas:' + arg + '>' 
	let res = str.match(zhengze)
	if(res){
		return res[1]
	}else{
		return null
	}
}

/* GET home page. */
router.get('/', function(req, res, next) {
	res.redirect('/nm/nmlist?r=938')//默认938
});
router.get('/nmlist',function(req,res){
	let room_name = req.query.r
	if(!req.query.ticket){
		let myReturnURL = 'http://qiandao.szu.edu.cn:81/nm' + req.originalUrl
		let url = CASserver + 'login?service=' + myReturnURL
		if(req.session.user){
			console.log('没有ticket,但有session，直接返回主页')
			console.log('session-->',req.session.user)
			if(room_name=='bgt'){
				room_name = '一楼报告厅'
			}
			res.render('index', { title: '计算机与软件学院 会议室申请',room_name:room_name});
		}
		else{
			console.log('没有ticket，也没有session，去获取ticket')
			return res.redirect(url)
		}
	}
	else{
		if(req.session.user){
			console.log('有ticket,也有session，直接返回主页')
			console.log('session-->',req.session.user)
			return res.redirect('/nm/nmlist?r=938')
			//res.render('index', { title: 'new meeting'});
		}
		else{
			// 保存session信息
			let myReturnURL = 'http://qiandao.szu.edu.cn:81/nm' + req.originalUrl
			console.log('myReturnURL url-->',myReturnURL)
			console.log('you ticket, 没有 session')
			let ticket = req.query.ticket
			let url = CASserver + 'serviceValidate?ticket=' + ticket + '&service=' + myReturnURL
			request(url, function (error, response, body) {
				    if (!error && response.statusCode == 200) {
				    	console.log('body -- >',body)
				       let user = pipei(body,'user'),//工号
						   eduPersonOrgDN = pipei(body,'eduPersonOrgDN'),//学院
						   alias = pipei(body,'alias'),//校园卡号
						   cn = pipei(body,'cn'),//姓名
						   gender = pipei(body,'gender'),//性别
						   containerId = pipei(body,'containerId'),//个人信息（包括uid，）
						   nianji = null
						if(containerId){
							RankName = containerId.substring(18,21)//卡类别 jzg-->教职工
						}else{
							RankName = null
						}
						if(user){
						   	nianji = user.substring(0,4)
						}else{
						   	nianji = null
						}
						console.log('check final result -->',user,eduPersonOrgDN,alias,cn,gender,containerId,RankName)
						let arg = {}
							arg.nianji = nianji
						   	arg.user = user
						   	arg.eduPersonOrgDN = eduPersonOrgDN
						   	arg.alias = alias
						   	arg.cn = cn
						   	arg.gender = gender
						   	arg.containerId = containerId
						   	arg.RankName = RankName
						   	
						   if(arg.user == null){
						   		console.log('ticket is unvalid,重新回去获取ticket，清空session')
						   		req.session.user = null
						   		console.log('check req.session.user-->',req.session.user)
						   		return res.json({'errCode':-1,'errMsg':body})
						   }else{
						   		arg.admin = shezhi_admin(cn)
						   		req.session.user = arg
						   		console.log('最终session---->',req.session.user)
						   		console.log('返回myreturnURL---->',myReturnURL)
						   		return res.redirect(myReturnURL)
						  }
				     }else{
				     	console.log(error)
				     }
			    })
		}
	}
})
function shezhi_admin(user){
	console.log('check cn----->',user)
	if(user == '洪岚军'|| user=='陈荣鑫')
		return 1
	else if(user == '曾小告')
		return 2
	else if(user == '刘蓓')
		return 3
	else if(user == '贺亮')
		return 4
	else if(user == '马晓亮')
		return 5
	else
		return 0
}
router.get('/eventjson',function(req,res){
	console.log('--------------------------------------------------------------')
	console.log('check start----->',(req.query.start).substring(0,10))
	console.log('check start----->',(req.query.end).substring(0,10))
	console.log('room_name--->',req.query.r)
	console.log('--------------------------------------------------------------')
	let starttimestamp = moment((req.query.start).substring(0,10)).format('X'),
		endtimestamp = moment((req.query.end).substring(0,10)).format('X'); 
	let search = meeting.find({})
		search.where('room_name').equals(req.query.r)
		search.where('date_timestamp').gte(starttimestamp)
		search.where('date_timestamp').lte(endtimestamp)
		search.sort({'date_timestamp':-1})
		search.exec(function(err,docs){
			if(err){
				console.log('err',err)
				return res.json({'code':-1,'msg':err})
			}
			let resultarr = [],
				temp = {}
			async.eachLimit(docs,1,function(item,cb){
				temp._id = item._id
				temp.start = item.date + ' ' + item.start
				temp.end = item.date + ' ' +item.end
				temp.title = item.title
				temp.phone = item.phone
				temp.fuzeren = item.fuzeren
				temp.isok = item.isok
				temp.date = item.date
				temp.applytime = item.applytime
				temp.applyname = item.applyname
				resultarr.push(temp)
				temp = {}
				cb()
			},function(err){
				if(err){
					console.log(err)
					return res.json(err)
				}
				console.log('resultarr--->',resultarr)
				return res.json(resultarr)
			})
		})
})
router.post('/getapplyinfo',function(req,res){
	let today = moment(req.body.firstDay_of_week).format('X'),
		today_7 = moment(req.body.endDay_of_week).format('X');
	//let today = moment(moment().format('YYYY-MM-DD')).format('X'),
	//	today_7 = moment(moment(moment().format('YYYY-MM-DD')).add(7, 'd').format('YYYY-MM-DD')).format('X');
	let firstDay_of_month = req.body.firstDay_of_month,
		endDay_of_month = req.body.endDay_of_month
	if(firstDay_of_month && endDay_of_month){
		console.log('查询月记录')
		console.log(moment(firstDay_of_month).format('X'),moment(endDay_of_month).format('X'))
		today = moment(firstDay_of_month).format('X')
		today_7 = moment(endDay_of_month).format('X')
	}	
	//console.log('today',today)
	//console.log('today_7',today_7)
	let room_name = req.body.room_name
	if(room_name == 'bgt'){
		room_name = '报告厅'
	}
	let search = meeting.find({})
		search.where('room_name').equals(room_name)
		search.where('date_timestamp').gte(today)
		search.where('date_timestamp').lte(today_7)
		search.sort({'date_timestamp':-1})
		search.exec(function(err,docs){
			if(err){
				console.log('err',err)
				return res.json({'code':-1,'msg':err})
			}
			console.log('docs',docs)
			return res.json({'code':0,'data':docs})
		})
})
router.get('/applyform', function(req, res, next) {
	if(req.query._id){
		let search = meeting.findOne({})
			search.where('_id').equals(req.query._id)
			search.exec(function(err,doc){
				if(err){
					console.log('err',err)
					return res.json(err)
				}
				res.render('applyform', { title: 'applyform' ,data:doc});
			})	
	}else{
		res.render('applyform', { title: 'applyform',data:null });
	}
})
router.get('/hysinfo', function(req, res, next) {
  res.render('hysinfo', { title: '会议室简况' });
})
//审批申请
//Model.update(conditions,doc,[options],[callback])根据条件更新所有：
//Model.findOneAndUpdate([conditions],[update],[options],[callback])根据指定条件更新一个：
router.get('/spsq', function(req, res, next) {
  res.render('spsq', { title: '审批申请' });
}).post('/spsq',function(req,res){//changeallday
	meeting.findByIdAndUpdate(req.body.myid,{
	 	isok:req.body.isok
	 }, function (err) {
	 	if(err) {
	 		console.log('审批失败')
	 		return res.json({'code':-1,'msg':err})
	 	} else {
			console.log('审批成功')
			return res.json({'code':0,'msg':'success'})
	 	}
	 })
}).post('/spsq_allday',function(req,res){
	meeting.findByIdAndUpdate(req.body.myid,{
	 	isok:req.body.isok
	 }, function (err) {
	 	if(err) {
	 		console.log('审批失败')
	 		return res.json({'code':-1,'msg':err})
	 	} else {
			console.log('审批成功')
			return res.json({'code':0,'msg':'success'})
	 	}
	 })
}).get('/spsq_allday', function(req, res, next) {
  res.render('spsq_allday', { title: '审批申请-全天' });
}).post('/changeallday',function(req,res){//changeallday
	meeting.findByIdAndUpdate(req.body._id,{
	 	end:req.body.end,
	 	alldayend:req.body.alldayend
	 }, function (err) {
	 	if(err) {
	 		console.log('更改失败')
	 		return res.json({'code':-1,'msg':err})
	 	} else {
			console.log('更改成功')
			return res.json({'code':0,'msg':'success'})
	 	}
	 })
})
router.post('/delnm',function(req,res){
	meeting.deleteOne({'_id':req.body._id},function(err){
		if(err){
			console.log('deleteOne err',err)
			return res.json({'code':-1,'msg':err})
		}
		return res.json({'code':0,'msg':'deleteOne success'})
	})
})
router.post('/add_applyform',function(req,res){
	if(req.body._id){
		console.log('修改-------')
		let updateobj = {
			room_name : req.body.room_name,
			title : req.body.title,
			num : req.body.num,
			start : req.body.start,
			end : req.body.end,
			date : req.body.date,
			fuzeren : req.body.fuzeren,
			phone :req.body.phone,
			applyname :req.body.applyname,
			date_timestamp : moment(req.body.date).format('X')
		}
		meeting.findByIdAndUpdate(req.body._id,updateobj,function(err){
			if(err){
				console.log('update err',err)
				return res.json({'code':-1,'msg':err})
			}
			return res.json({'code':0,'msg':'success'})
		})
	}else{
		console.log('new meeting')
		let newmeeting = new meeting({
			room_name : req.body.room_name,
			title : req.body.title,
			num : req.body.num,
			start : req.body.start,
			end : req.body.end,
			date : req.body.date,
			fuzeren : req.body.fuzeren,
			phone :req.body.phone,
			applyname :req.body.applyname,
			date_timestamp : moment(req.body.date).format('X')
		})
		newmeeting.save(function(err,doc){
			if(err){
				console.log('err',err)
				return res.json({'code':-1,'msg':err})
			}
			console.log('doc',doc)
			return res.json({'code':0,'msg':'success'})
		})
	}
})
router.get('/applyform_allday', function(req, res, next) {
	if(req.query._id){
		let search = meeting.findOne({})
			search.where('_id').equals(req.query._id)
			search.exec(function(err,doc){
				if(err){
					console.log('err',err)
					return res.json(err)
				}
				res.render('applyform_allday', { title: 'applyform_allday' ,data:doc});
			})	
	}else{
		res.render('applyform_allday', { title: 'applyform_allday',data:null });
	}
})
router.post('/add_applyform_allday',function(req,res){
	if(req.body._id){
		console.log('修改-------')
		let updateobj = {
			room_name : req.body.room_name,
			title : req.body.title,
			num : req.body.num,
			start : req.body.start,
			end : req.body.end,
			date : req.body.date,
			fuzeren : req.body.fuzeren,
			phone :req.body.phone,
			applyname :req.body.applyname,
			date_timestamp : moment(req.body.date).format('X')
		}
		meeting.findByIdAndUpdate(req.body._id,updateobj,function(err){
			if(err){
				console.log('update err',err)
				return res.json({'code':-1,'msg':err})
			}
			return res.json({'code':0,'msg':'success'})
		})
	}else{
		console.log('new meeting allday')
		console.log('----------------------------------------')
		let newmeeting = new meeting({
			room_name : req.body.room_name,
			title : req.body.title,
			num : req.body.num,
			start : req.body.start,
			alldaystart : req.body.start,
			end : req.body.start,
			alldayend : req.body.start,
			date : req.body.start,
			fuzeren : req.body.fuzeren,
			phone :req.body.phone,
			applyname :req.body.applyname,
			date_timestamp : moment(req.body.date).format('X'),
			allDay:true
		})
		newmeeting.save(function(err,doc){
			if(err){
				console.log('err',err)
				return res.json({'code':-1,'msg':err})
			}
			console.log('doc',doc)
			return res.json({'code':0,'msg':'success'})
		})
	}
})
module.exports = router;
