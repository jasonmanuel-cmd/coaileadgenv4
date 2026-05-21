using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CoaiLeadMonitor.Pages;

public sealed partial class SettingsPage : Page
{
    public SettingsPage()
    {
        InitializeComponent();
    }

    private void OnSaveClick(object sender, RoutedEventArgs e)
    {
        SaveStatusText.Text = "Settings saved.";
    }
}
