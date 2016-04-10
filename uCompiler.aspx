<%@ Page Language="C#" Inherits="ucore_web_ASPNET.UCompiler" %>
<!DOCTYPE html>
<html>
<head runat="server">
	<title>uCompiler</title>
	<style type="text/css">
		body {background-color:#000000;}
		form#form_l {display:none;}
		form#form_r {display:none;}
	</style>
</head>
<body>
	<div id="board"></div>
	<form id="form_l" runat="server">
		<asp:Button id="asp_btl" runat="server" Text="" OnClick="loadFile_bt"/>
	</form>
	<form id="form_r" runat="server">
		<asp:Button id="asp_btr" runat="server" Text="" OnClick="saveFile_bt"/>
		<asp:Button id="asp_ctr" runat="server" Text=""/>
	</form>
	<script type="text/javascript" src="c.js"></script>
</body>
</html>

