import 'package:flutter_test/flutter_test.dart';
import 'package:amda_app/main.dart';

void main() {
  testWidgets('App renders splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const AmdaApp());
    expect(find.byType(AmdaApp), findsOneWidget);
  });
}
