function HYGF2(){
	HYGF2_JTsetup('x-hw,x-hws');
}
function HYGF2_JTsetup(str){
	var eles=document.querySelectorAll(str);
	if(eles.length<2){
		if(!!eles[0]){
			eles[0].removeAttribute('onclick');
		}
		return;
	}
	for(var i=0; i<eles.length; ++i){
		eles[i].setAttribute('onclick', HYGF2_scrollPosition(eles[i==eles.length-1?0:i+1]));
		
	}
}

function HYGF2_scrollPosition(target){
	var _id=target.getAttribute('id');
	if(!_id){
		_id='random'+Math.round(Math.random()*100000);
		target.setAttribute('id', _id);
	}
	if(!isBluedict())
		return "window.location.href='#"+_id+"'";
	return "window.location.href='entry://#"+_id+"'";
}

function isBluedict(){
	return !!document.querySelector('.bd_body, .lm5ppbody.bluedict');
}

function toggle_active(ctl)
{
    ctl.parentElement.classList.toggle('is-active');
}