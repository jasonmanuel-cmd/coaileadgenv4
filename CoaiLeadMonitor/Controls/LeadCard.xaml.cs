using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using CoaiLeadMonitor.Models;

namespace CoaiLeadMonitor.Controls;

public sealed partial class LeadCard : UserControl
{
    public static readonly DependencyProperty LeadDataProperty =
        DependencyProperty.Register(nameof(LeadData), typeof(Lead), typeof(LeadCard),
            new PropertyMetadata(null, OnLeadDataChanged));

    public LeadCard()
    {
        InitializeComponent();
    }

    public Lead LeadData
    {
        get => (Lead)GetValue(LeadDataProperty);
        set => SetValue(LeadDataProperty, value);
    }

    public event RoutedEventHandler? OpenUrl;
    public event RoutedEventHandler? MarkRead;
    public event RoutedEventHandler? ToggleSave;
    public event RoutedEventHandler? ToggleContacted;
    public event RoutedEventHandler? Delete;

    private static void OnLeadDataChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is LeadCard card && e.NewValue is Lead lead)
        {
            card.MarkReadBtn.Content = lead.IsRead ? "Mark Unread" : "Mark Read";
            card.SaveBtn.Content = lead.IsSaved ? "Unsave" : "Save";
            card.ContactBtn.Content = lead.IsContacted ? "Uncontact" : "Contact";
        }
    }

    private void OnOpenUrl(object s, RoutedEventArgs e) => OpenUrl?.Invoke(this, e);
    private void OnMarkRead(object s, RoutedEventArgs e) => MarkRead?.Invoke(this, e);
    private void OnToggleSave(object s, RoutedEventArgs e) => ToggleSave?.Invoke(this, e);
    private void OnToggleContacted(object s, RoutedEventArgs e) => ToggleContacted?.Invoke(this, e);
    private void OnDelete(object s, RoutedEventArgs e) => Delete?.Invoke(this, e);
}
