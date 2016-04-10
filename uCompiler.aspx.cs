using System;
using System.Web;
using System.Web.UI;
using System.IO;
using System.Text;

namespace ucore_web_ASPNET
{
	public partial class UCompiler : System.Web.UI.Page
	{
		private byte[] bts = new byte[65536];
		public void loadFile_bt(object sender, EventArgs args)
		{
			this.loadFile(asp_btl.Text);
		}
		public void saveFile_bt(object sender, EventArgs args)
		{
			this.saveFile(asp_btr.Text, asp_ctr.Text);
		}
		public void loadFile(string filename)
		{
			try
			{
				FileStream file = new FileStream(filename, FileMode.Open);
				file.Seek(0, SeekOrigin.Begin);
				file.Read(bts, 0, bts.Length); 
				asp_btl.Text = Encoding.UTF8.GetString(bts);
				file.Close();
			}
			catch (IOException e)
			{
				asp_btl.Text = "Error occors while reading '" + filename + "' : " + e.Message;
			}
		}
		public void saveFile(string filename, string content)
		{
			try
			{
				FileStream fs = new FileStream(filename, FileMode.Create);
				byte[] ctb = System.Text.Encoding.Default.GetBytes(content);
				fs.Write(ctb, 0, ctb.Length);
				fs.Flush();
				fs.Close();
			}
			catch (IOException e)
			{
				asp_btr.Text = "Error occors while writing '" + filename + "' : " + e.Message;
			}
		}
	}
}

