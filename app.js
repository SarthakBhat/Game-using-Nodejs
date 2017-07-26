var mongojs = require('mongojs');
var db = mongojs('localhost:27017/myGame',['account','progress']);



var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client' , express.static(__dirname + '/client'));
	
serv.listen(8888);	
console.log("Sever started");

var SOCKET_LIST = {};


var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	}
    self.update = function(){
     self.updatePosition();
    }
    self.updatePosition = function(){
      self.x += self.spdX;
      self.y += self.spdY;
    }
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2)+Math.pow(self.y-pt.y,2));
	}	
    return self;
}	
		
console.log("After Entity");
var Player = function(id){
		var self = Entity();
		self.id = id;
		self.number = "" + Math.floor(10*Math.random());
		self.pressRight=false;
		self.pressLeft=false;
		self.pressUp=false;
		self.pressDown=false;
		self.pressAttack=false;
		self.mouseAngle=0;
		self.maxSpd=10;
		self.hp =10;
		self.hpMax = 10;
		self.score = 0;
		
		
		
      var updateSpd = function(){
        if(self.pressRight)
            self.spdX = self.maxSpd;
        else if(self.pressLeft)
            self.spdX = -self.maxSpd;
		else
			self.spdX = 0;
		
        if(self.pressUp)
            self.spdY = -self.maxSpd;
        else if(self.pressDown)
            self.spdY = self.maxSpd;
        else 
            self.spdY = 0;
        }
		
	  var super_update = self.update;
		self.update = function() {
		    updateSpd();
			super_update();
			if(self.pressAttack)
	        {
		      self.shootBullet(self.mouseAngle);
	       }
		}
		self.shootBullet= function(angle){
			var b  = Bullet(self.id,angle);
			b.x = self.x;
			b.y = self.y;
		}	
	  self.getInitPack = function(){
		  return {
			  id:self.id,
		      x:self.x,
		      y:self.y,
		      number:self.number,
			  hp:self.hp,
			  hpMax:self.hpMax,
			  score:self.score,
		  };
	  }  
	  self.getUpdatePack = function(){
		  return{
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
		};
	  }	
		  
		  
	  Player.list[id] = self;
	   initPack.player.push(self.getInitPack());
		 
      return self;		
		
	}
	

	
	 
	Player.list = {};	
	Player.onConnect = function(socket){
		var player = Player(socket.id);
		socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressLeft = data.state;
		if(data.inputId === 'right')
			player.pressRight = data.state;
		if(data.inputId === 'up')
			player.pressUp = data.state;
		if(data.inputId === 'down')
			player.pressDown = data.state;
		if(data.inputId === 'attack')
			player.pressAttack = data.state;
		if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});	
	
	 socket.emit('init',{
		 player:Player.getAllInitPack(),
		 bullet:Bullet.getAllInitPack(),
	});
}	
	
	Player.getAllInitPack = function(){
		var players = [];
		for(var i in Player.list)
			players.push(Player.list[i].getInitPack());
		return players;
	}	
	Player.onDisconnect = function(socket){
		delete Player.list[socket.id];
		removePack.player.push(socket.id);
	}	
	Player.update = function(){
		var pack = [];
	    for(var i in Player.list){
	    var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());	
		
    }
	return pack;
	}
console.log("Before Bullet");	
 var Bullet = function(parent,angle){
	 var self = Entity();
	 self.id = Math.random();
	 self.parent = parent;
	 self.spdX =  Math.cos(angle/180*Math.PI) * 10;
	 self.spdY =  Math.sin(angle/180*Math.PI) * 10;
	 self.timer = 0;
	 self.toRemove = false;
	 var super_update = self.update;
	 self.update = function(){
		 self.timer += 1;
		 if(self.timer > 100)
			 self.toRemove = true;	
		 super_update();
		 for(var i in Player.list){
			 var p = Player.list[i];
			 if(self.getDistance(p)<24 && self.parent !== p.id){
				 p.hp -=1;
				 if(p.hp <= 0){
				   var shooter = Player.list[self.parent];
				   if(shooter)
					  shooter.score += 1;
				   p.hp = p.hpMax;
				   p.x = Math.random() * 500;
				   p.y = Math.random() * 500;
				 }
				 
				 self.toRemove = true;
			 }
		 }	 
			 
	}
	 self.getInitPack = function(){
		 return{
			 id:self.id,
		     x:self.x,
		     y:self.y,
		 };
	 }	
     self.getUpdatePack = function(){
        return{		
            id:self.id,
			 x:self.x,
			 y:self.y,
		};
	 }
     Bullet.list[self.id] = self;
	 initPack.bullet.push(self.getInitPack()); 
     return self;
 }
  Bullet.list = {};
  Bullet.update = function(){
	  
      var pack = [];
	  for(var i in Bullet.list){
	    var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove){
			
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		}	
		else
		   pack.push(bullet.getUpdatePack());	
		
    }
	return pack;
	}
    Bullet.getAllInitPack = function(){
        var bullets = [];
        for(var i in Bullet.list)
          bullets.push(Bullet.list[i].getInitPack());
        return bullets;
    }		
     var isValidPassword = function(data,cb){
	    db.account.find({username:data.username,password:data.password},function(err,res){
			if(res.length > 0)
				cb(true);
			else
				cb(false);
		});	
	 } 
     var UsernameTaken = function(data,cb){
	     db.account.find({username:data.username},function(err,res){
			if(res.length > 0)
				cb(true);
			else
				cb(false);
		});	
	 } 
     var addUser = function(data,cb){              //cb means callback which is used whenever a future call to function has to be made
	  db.account.insert({username:data.username,password:data.password},function(err){
		  cb();
	  });
	 } 
var io = require('socket.io')(serv,{}); 
io.sockets.on('connection',function(socket){
	console.log("Socket Connection");
	socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
	socket.on('signIn', function(data){
		isValidPassword(data,function(res){
		  if(res){
	        Player.onConnect(socket);
			socket.emit('signInResponse',{success:true});
		}
        else{
            socket.emit('signInResponse',{success:false});	
        }
    });	
	});	
    socket.on('signUp', function(data){
		UsernameTaken(data,function(res){
			if(res){
			
			socket.emit('signUpResponse',{success:false});
		}
        else{
			addUser(data,function(err){
            socket.emit('signUpResponse',{success:true});	
        });
		}
    });	
	});	

	
	socket.on('disconnect',function(){
	delete SOCKET_LIST[socket.id];
	Player.onDisconnect(socket);	
	});
	socket.on('sendMsgtoServer',function(data){
		var playerName = (" " + socket.id).slice(2,7);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat',playerName + ':' + data)
	}
   });

});   

 var initPack = {player:[],bullet:[]};
 var removePack = {player:[],bullet:[]};
setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update()
	}	
	
	for( var i in SOCKET_LIST){
	 var socket = SOCKET_LIST[i];
	 socket.emit('init' ,initPack);
	 socket.emit('update',pack);
	 socket.emit('remove' ,removePack);
	}	
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	
},1000/25)
	