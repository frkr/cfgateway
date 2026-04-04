export default function (agora:Date,nextId:string):string{
	return `${agora.getFullYear()}${agora.getMonth() + 1}${agora.getDate()}${agora.getHours()}${agora.getMinutes()}${agora.getSeconds()}-${nextId}.txt`
}
