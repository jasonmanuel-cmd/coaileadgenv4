using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;

namespace CoaiLeadMonitor.Converters;

public class ScoreToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is int score)
        {
            return score switch
            {
                >= 8 => new SolidColorBrush(Microsoft.UI.Colors.Firebrick),
                >= 5 => new SolidColorBrush(Microsoft.UI.Colors.Orange),
                _ => new SolidColorBrush(Microsoft.UI.Colors.Gray)
            };
        }
        return new SolidColorBrush(Microsoft.UI.Colors.Gray);
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
        => throw new NotImplementedException();
}
