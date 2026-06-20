import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class DoshaQuizScreen extends StatefulWidget {
  const DoshaQuizScreen({super.key});
  @override
  State<DoshaQuizScreen> createState() => _DoshaQuizScreenState();
}

class _DoshaQuizScreenState extends State<DoshaQuizScreen> {
  int _currentQuestion = 0;
  final List<String> _questions = [
    'How would you describe your body frame?',
    'How is your skin generally?',
    'What is your sleep pattern like?',
  ];
  final List<List<String>> _options = [
    ['Thin / Slender', 'Medium / Athletic', 'Broad / Heavy'],
    ['Dry / Rough', 'Sensitive / Prone to acne', 'Oily / Smooth'],
    ['Light / Interrupted', 'Sound / Moderate', 'Deep / Heavy'],
  ];

  void _nextQuestion() {
    if (_currentQuestion < _questions.length - 1) {
      setState(() => _currentQuestion++);
    } else {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Quiz Complete! 🎉', style: TextStyle(fontFamily: 'PlayfairDisplay', color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
          content: const Text('Your primary dosha is Vata. We have updated your diet plan and reminders accordingly.', style: TextStyle(fontFamily: 'Poppins')),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('Done', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
            )
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dosha Quiz', style: TextStyle(color: AppColors.primaryGreen)), backgroundColor: Colors.white, iconTheme: const IconThemeData(color: AppColors.primaryGreen)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Question ${_currentQuestion + 1} of ${_questions.length}', style: const TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: (_currentQuestion + 1) / _questions.length, backgroundColor: const Color(0xFFEAF5EE), valueColor: const AlwaysStoppedAnimation(AppColors.primaryGreen)),
            const SizedBox(height: 32),
            Text(_questions[_currentQuestion], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textDark)),
            const SizedBox(height: 32),
            ..._options[_currentQuestion].map((opt) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ElevatedButton(
                onPressed: _nextQuestion,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primaryGreen,
                  padding: const EdgeInsets.all(20),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: AppColors.primaryGreen.withValues(alpha: 0.3))),
                  alignment: Alignment.centerLeft,
                  elevation: 0,
                ),
                child: Text(opt, style: const TextStyle(fontFamily: 'Poppins', fontSize: 16)),
              ),
            )),
          ],
        ),
      ),
    );
  }
}

class DietPlanScreen extends StatefulWidget {
  const DietPlanScreen({super.key});

  @override
  State<DietPlanScreen> createState() => _DietPlanScreenState();
}

class _DietPlanScreenState extends State<DietPlanScreen> {
  String _dosha = 'Vata';
  final Map<String, Map<String, dynamic>> _plans = {
    'Vata': {
      'title': 'Vata Balancing Diet',
      'intro': 'Warm, moist, grounding foods to calm airy Vata.',
      'meals': [
        {'day': 'Mon', 'breakfast': 'Oatmeal w/ ghee + almonds', 'lunch': 'Rice + mung dal + cooked veggies', 'dinner': 'Khichdi w/ warm milk'},
        {'day': 'Tue', 'breakfast': 'Warm porridge + dates', 'lunch': 'Vegetable stew + chapati', 'dinner': 'Root vegetable soup'},
        {'day': 'Wed', 'breakfast': 'Stewed apples + cinnamon', 'lunch': 'Quinoa + carrots + spinach', 'dinner': 'Lentil soup + rice'},
      ]
    },
    'Pitta': {
      'title': 'Pitta Cooling Diet',
      'intro': 'Cool, sweet, bitter foods to soothe fiery Pitta.',
      'meals': [
        {'day': 'Mon', 'breakfast': 'Sweet rice pudding', 'lunch': 'Cucumber raita + rice', 'dinner': 'Mung beans + leafy greens'},
        {'day': 'Tue', 'breakfast': 'Milk w/ rice', 'lunch': 'Coconut rice + veggies', 'dinner': 'Quinoa salad w/ mint'},
        {'day': 'Wed', 'breakfast': 'Pears + cardamom', 'lunch': 'Basmati rice + gourd', 'dinner': 'Chickpea curry (mild)'},
      ]
    },
    'Kapha': {
      'title': 'Kapha Energizing Diet',
      'intro': 'Light, warm, spicy foods to stimulate heavy Kapha.',
      'meals': [
        {'day': 'Mon', 'breakfast': 'Ginger tea + toast', 'lunch': 'Barley soup + veggies', 'dinner': 'Spiced lentils + greens'},
        {'day': 'Tue', 'breakfast': 'Apple + cinnamon tea', 'lunch': 'Millet + bitter greens', 'dinner': 'Vegetable stir-fry (dry)'},
        {'day': 'Wed', 'breakfast': 'Pomegranate + spices', 'lunch': 'Quinoa khichdi (spicy)', 'dinner': 'Bean soup w/ ginger'},
      ]
    }
  };

  @override
  Widget build(BuildContext context) {
    final plan = _plans[_dosha]!;
    final meals = plan['meals'] as List;

    return Scaffold(
      appBar: AppBar(title: const Text('Diet Plan', style: TextStyle(color: AppColors.primaryGreen)), backgroundColor: Colors.white, iconTheme: const IconThemeData(color: AppColors.primaryGreen)),
      floatingActionButton: FloatingActionButton(
        onPressed: _addMealDay,
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: ['Vata', 'Pitta', 'Kapha'].map((d) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ElevatedButton(
                  onPressed: () => setState(() => _dosha = d),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _dosha == d ? AppColors.primaryGreen : Colors.white,
                    foregroundColor: _dosha == d ? Colors.white : AppColors.primaryGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.primaryGreen)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                  ),
                  child: Text(d, style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: AppColors.backgroundGradient, borderRadius: BorderRadius.circular(20)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plan['title'], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(plan['intro'], style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Colors.white)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ...meals.map((m) => Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(m['day'], style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 18, color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.edit, color: AppColors.primaryGreen, size: 20),
                      onPressed: () => _editMeal(m),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildMealRow('🌅 Breakfast', m['breakfast']),
                const SizedBox(height: 8),
                _buildMealRow('🍛 Lunch', m['lunch']),
                const SizedBox(height: 8),
                _buildMealRow('🍲 Dinner', m['dinner']),
              ],
            ),
          )),
        ],
      ),
    );
  }

  void _addMealDay() {
    final List<String> days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final meals = (_plans[_dosha]!['meals'] as List).map((m) => m['day'].toString()).toList();
    final remaining = days.where((d) => !meals.contains(d)).toList();

    if (remaining.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All 7 days already added!'), backgroundColor: AppColors.primaryGreen));
      return;
    }

    String selectedDay = remaining.first;
    final bCtrl = TextEditingController();
    final lCtrl = TextEditingController();
    final dCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('➕ Add Day Plan', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: selectedDay,
                decoration: InputDecoration(
                  labelText: 'Day',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                ),
                items: remaining.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                onChanged: (v) => setModalState(() => selectedDay = v!),
              ),
              const SizedBox(height: 16),
              TextField(controller: bCtrl, decoration: InputDecoration(labelText: 'Breakfast', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
              const SizedBox(height: 12),
              TextField(controller: lCtrl, decoration: InputDecoration(labelText: 'Lunch', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
              const SizedBox(height: 12),
              TextField(controller: dCtrl, decoration: InputDecoration(labelText: 'Dinner', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (bCtrl.text.isEmpty || lCtrl.text.isEmpty || dCtrl.text.isEmpty) return;
                  setState(() {
                    (_plans[_dosha]!['meals'] as List).add({
                      'day': selectedDay,
                      'breakfast': bCtrl.text,
                      'lunch': lCtrl.text,
                      'dinner': dCtrl.text,
                    });
                  });
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Add to Plan', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  void _editMeal(Map<String, dynamic> meal) {
    final TextEditingController bCtrl = TextEditingController(text: meal['breakfast']);
    final TextEditingController lCtrl = TextEditingController(text: meal['lunch']);
    final TextEditingController dCtrl = TextEditingController(text: meal['dinner']);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Edit ${meal['day']} Meals', style: const TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 20),
            TextField(controller: bCtrl, decoration: InputDecoration(labelText: 'Breakfast', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
            const SizedBox(height: 16),
            TextField(controller: lCtrl, decoration: InputDecoration(labelText: 'Lunch', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
            const SizedBox(height: 16),
            TextField(controller: dCtrl, decoration: InputDecoration(labelText: 'Dinner', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)))),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  meal['breakfast'] = bCtrl.text;
                  meal['lunch'] = lCtrl.text;
                  meal['dinner'] = dCtrl.text;
                });
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Save Changes', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildMealRow(String type, String food) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 95, child: Text(type, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark))),
        Expanded(child: Text(food, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted))),
      ],
    );
  }
}

class ReminderScreen extends StatefulWidget {
  const ReminderScreen({super.key});
  @override
  State<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends State<ReminderScreen> {
  final List<Map<String, dynamic>> _reminders = [
    {'id': 1, 'title': 'Ashwagandha 1tsp', 'time': '08:00 AM', 'type': 'Medicine'},
    {'id': 2, 'title': 'Drink Warm Water', 'time': '06:00 AM', 'type': 'Water'},
  ];

  void _showAddReminder() {
    String type = 'Medicine';
    String time = '08:00 AM';
    final TextEditingController itemCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('➕ Add Reminder', style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                  ),
                  items: ['Medicine', 'Diet', 'Exercise', 'Water'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setModalState(() => type = v!),
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () async {
                    final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 8, minute: 0));
                    if (t != null) setModalState(() => time = t.format(context));
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                    decoration: BoxDecoration(border: Border.all(color: AppColors.inputBorder), borderRadius: BorderRadius.circular(12)),
                    child: Text(time, style: const TextStyle(fontFamily: 'Poppins', fontSize: 14)),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: itemCtrl,
                  decoration: InputDecoration(
                    hintText: 'e.g. Ashwagandha 1tsp',
                    hintStyle: const TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.inputBorder)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    if (itemCtrl.text.isEmpty) return;
                    setState(() {
                      _reminders.add({
                        'id': DateTime.now().millisecondsSinceEpoch,
                        'title': itemCtrl.text,
                        'time': time,
                        'type': type,
                      });
                    });
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text('Add Reminder', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 20),
              ],
            ),
          );
        }
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reminders', style: TextStyle(color: AppColors.primaryGreen)), backgroundColor: Colors.white, iconTheme: const IconThemeData(color: AppColors.primaryGreen)),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddReminder,
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _reminders.isEmpty 
        ? const Center(child: Text('No reminders yet', style: TextStyle(fontFamily: 'Poppins', color: AppColors.textMuted)))
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: _reminders.length,
            itemBuilder: (context, index) {
              final r = _reminders[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.inputBorder)),
                child: Row(
                  children: [
                    Icon(r['type'] == 'Medicine' ? Icons.medication : r['type'] == 'Water' ? Icons.water_drop : Icons.fitness_center, color: AppColors.primaryGreen, size: 28),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r['title'], style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textDark)),
                          Text('${r['type']} • ${r['time']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                      onPressed: () => setState(() => _reminders.removeWhere((item) => item['id'] == r['id'])),
                    ),
                  ],
                ),
              );
            },
          ),
    );
  }
}
