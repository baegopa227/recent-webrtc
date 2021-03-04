part1.js
C:\Users\user>wscat -c ws://localhost:8888
> Hello World  => User connected
> a                => Got message : a


part2.js
> {"type":"login","name":"test1"}
< {"type":"login","success":true}

> {"type":"login","name":"test1"}
< {"type":"login","success":false}

offer, answer
{"type":"login","name":"test1"}
{"type":"login","name":"test2"}

> {"type":"offer","name":"test2","offer":"Hello"}
< {"type":"offer","offer":"Hello","name":"test1"}

> {"type":"answer","name":"test1","answer":"Hello test1"}
< {"type":"answer","answer":"Hello test1"}

> {"type":"candidate","candidate":"test message","name":"test2"}
< {"type":"candidate","candidate":"test message"}