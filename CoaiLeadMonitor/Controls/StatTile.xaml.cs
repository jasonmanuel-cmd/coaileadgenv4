using Microsoft.UI.Xaml.Controls;

namespace CoaiLeadMonitor.Controls;

public sealed partial class StatTile : UserControl
{
    public StatTile()
    {
        InitializeComponent();
    }

    public string Label
    {
        get => LabelText.Text;
        set => LabelText.Text = value;
    }

    public string Value
    {
        get => ValueText.Text;
        set => ValueText.Text = value;
    }
}
