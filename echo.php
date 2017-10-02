<?php

$echo = $_POST["echo"];

if ($echo) {
	echo $echo;
}
else {
?>
<html>
<body>

<form method="post">
<textarea name="echo" id="echo"></textarea>
<input type="submit"></input>	
</form>
</body>
</html>

<?php	
}
?>
