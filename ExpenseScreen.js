import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [editingExpense, setEditingExpense] = useState(null); 

  const getFilteredExpenses = () => {
  if (filter === 'ALL') return expenses;

  const today = new Date();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return expenses.filter((expense) => {
    if (!expense.date) return false; 
    const expenseDate = new Date(expense.date);

    if (filter === 'WEEK') {
      return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
    }

    if (filter === 'MONTH') {
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    }

    return true;
  });
};

  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };
  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

  const trimmedCategory = category.trim();
  const trimmedNote = note.trim();

  if (!trimmedCategory) {
    return;
  }

  // Use today's date as YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10); // e.g. "2025-11-22"

  await db.runAsync(
    'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
    [amountNumber, trimmedCategory, trimmedNote || null, today]
  );

  setAmount('');
  setCategory('');
  setNote('');

  loadExpenses();
};

const saveEdit = async () => {
  if (!editingExpense) return;

     const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();

    if (!trimmedCategory) {
      return;
    }

    await db.runAsync(
      `UPDATE expenses
       SET amount = ?, category = ?, note = ?, date = ?
       WHERE id = ?;`,
      [
        amountNumber,
        trimmedCategory,
        trimmedNote || null,
        editingExpense.date,
        editingExpense.id,
      ]
    );

    setAmount('');
    setCategory('');
    setNote('');
    setEditingExpense(null);

    loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  const startEditing = (expense) => {
    setEditingExpense(expense);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setNote(expense.note || '');
  };


  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        <Text style={styles.expenseDate}>{item.date}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
      </View>

         <View style={styles.actions}>
      <TouchableOpacity onPress={() => startEditing(item)} style={styles.editButton}>
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
     </View>
  );

  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        date TEXT NOT NULL
        );
      `);

      await loadExpenses();
    }

    setup();
  }, []);

  
  const filteredExpenses = getFilteredExpenses();

    const totalSpending = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const filterLabel =
    filter === 'ALL'
      ? 'All'
      : filter === 'WEEK'
      ? 'This Week'
      : 'This Month';

  const categoryTotals = filteredExpenses.reduce((totals, expense) => {
    const cat = expense.category || 'Other';
    const amt = Number(expense.amount || 0);
    if (!totals[cat]) {
      totals[cat] = 0;
    }
    totals[cat] += amt;
    return totals;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

<View style={styles.filterRow}>
      <Button title="All" onPress={() => setFilter('ALL')} />
      <Button title="This Week" onPress={() => setFilter('WEEK')} />
      <Button title="This Month" onPress={() => setFilter('MONTH')} />
    </View>

    <View style={styles.totalsCard}>
  <Text style={styles.totalHeading}>Total Spending ({filterLabel}):</Text>
  <Text style={styles.totalAmount}>${totalSpending.toFixed(2)}</Text>

  <Text style={styles.categoryHeading}>By Category:</Text>

  {Object.keys(categoryTotals).length === 0 ? (
    <Text style={styles.categoryRow}>No data for this filter.</Text>
  ) : (
    Object.entries(categoryTotals).map(([cat, amt]) => (
      <Text key={cat} style={styles.categoryRow}>
        {cat}: ${amt.toFixed(2)}
      </Text>
    ))
  )}
</View>


      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <Button
         title={editingExpense ? "Save Changes" : "Add Expense"}
          onPress={editingExpense ? saveEdit : addExpense}/>
      </View>

      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
  filterRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},
expenseDate: {
  fontSize: 12,
  color: '#d1d5db',
},

totalsCard: {
  backgroundColor: '#1f2937',
  padding: 12,
  borderRadius: 8,
  marginBottom: 16,
},
totalHeading: {
  color: '#e5e7eb',
  fontSize: 14,
  marginBottom: 4,
},
totalAmount: {
  color: '#fbbf24',
  fontSize: 20,
  fontWeight: '700',
  marginBottom: 8,
},
categoryHeading: {
  color: '#e5e7eb',
  fontSize: 14,
  marginTop: 4,
  marginBottom: 4,
},
categoryRow: {
  color: '#d1d5db',
  fontSize: 13,
},
actions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
editButton: {
  paddingHorizontal: 6,
  paddingVertical: 2,
  backgroundColor: '#3b82f6',
  borderRadius: 4,
},
editText: {
  color: 'white',
  fontSize: 12,
},
});