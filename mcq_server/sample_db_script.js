db.user_login.drop();
db.user_quiz.drop();

db.user_login.insert([
	{
		username:"taek",
		password:"0000"
	},
	{
		username:"marti",
		password:"0000"
	},
	{
		username:"derrick",
		password:"0000"
	},
	{
		username:"armando",
		password:"0000"
	},
	{
		username:"bjorn",
		password:"0000"
	}
]);

db.user_quiz.insert([
	{
		username:"taek",
		quiz:[-1,-1,-1,-1,-1,-1],
		next_quiz: 0
	},
	{
		username:"marti",
		quiz:[-1,-1,-1,-1,-1,-1],
		next_quiz: 0
	},
	{
		username:"derrick",
		quiz:[-1,-1,-1,-1,-1,-1],
		next_quiz: 0
	},
	{
		username:"armando",
		quiz:[-1,-1,-1,-1,-1,-1],
		next_quiz: 0
	},
	{
		username:"bjorn",
		quiz:[-1,-1,-1,-1,-1,-1],
		next_quiz: 0
	}
]);