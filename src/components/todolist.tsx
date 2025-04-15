'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../app/lib/firebase';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({});
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const completedCount = tasks.filter((task) => task.completed).length;
  const uncompletedCount = tasks.length - completedCount;

  const sortTasks = (taskList: Task[]) =>
    taskList.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  useEffect(() => {
    const fetchTasks = async () => {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      setTasks(sortTasks(tasksData));
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      const updatedTasks = [...tasks];

      tasks.forEach((task, index) => {
        const remaining = calculateTimeRemaining(task.deadline);
        newTimeRemaining[task.id] = remaining;

        // Jika deadline sudah lewat dan task belum selesai, tandai sebagai selesai
        if (remaining === 'Waktu habis!' && !task.completed) {
          updatedTasks[index] = { ...task, completed: true };

          // Update ke Firestore
          updateDoc(doc(db, 'tasks', task.id), {
            completed: true,
          });
        }
      });

      setTimeRemaining(newTimeRemaining);
      setTasks(sortTasks(updatedTasks));
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  const calculateTimeRemaining = (deadline: string): string => {
    const deadlineTime = new Date(deadline).getTime();
    const now = new Date().getTime();
    const difference = deadlineTime - now;

    if (difference <= 0) return 'Waktu habis!';

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}j ${minutes}m ${seconds}d`;
  };

  const addTask = async (): Promise<void> => {
    let keepTrying = true;

    while (keepTrying) {
      const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Tambahkan tugas baru',
        html:
          '<input id="swal-input1" class="swal2-input" placeholder="Nama tugas">' +
          '<input id="swal-input2" type="datetime-local" class="swal2-input">' +
          '<div id="swal-error" style="display: none; color: red; font-size: 0.9rem; margin-top: 5px;"></div>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Tambah',
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const text = (document.getElementById('swal-input1') as HTMLInputElement)?.value;
          const deadline = (document.getElementById('swal-input2') as HTMLInputElement)?.value;

          const errorDiv = document.getElementById('swal-error');
          if (!text.trim() || !deadline.trim()) {
            if (errorDiv) {
              errorDiv.textContent = 'Nama tugas dan deadline harus diisi.';
              errorDiv.style.display = 'block';
            }
            return false;
          }

          return [text, deadline];
        },
      });

      if (!isConfirmed || !formValues) return;

      const [text, deadline] = formValues;

      keepTrying = false;

      const newTask: Omit<Task, 'id'> = {
        text,
        completed: false,
        deadline,
      };

      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      const updatedTasks = [...tasks, { id: docRef.id, ...newTask }];
      setTasks(sortTasks(updatedTasks));

      setPopupMessage('Tugas berhasil ditambahkan!');
      setTimeout(() => setPopupMessage(null), 3000);
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'tasks', id));
    const filtered = tasks.filter((task) => task.id !== id);
    setTasks(sortTasks(filtered));

    setPopupMessage('Tugas berhasil dihapus!');
    setTimeout(() => setPopupMessage(null), 3000);
  };

  const editTask = async (task: Task): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Tugas',
      html:
        `<input id="swal-input1" class="swal2-input" placeholder="Nama tugas" value="${task.text}">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${new Date(task.deadline).toISOString().slice(0, 16)}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement)?.value,
          (document.getElementById('swal-input2') as HTMLInputElement)?.value,
        ];
      },
    });

    if (formValues && formValues[0] && formValues[1]) {
      const updatedTask = {
        ...task,
        text: formValues[0],
        deadline: formValues[1],
      };

      await updateDoc(doc(db, 'tasks', task.id), {
        text: updatedTask.text,
        deadline: updatedTask.deadline,
      });

      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? updatedTask : t
      );
      setTasks(sortTasks(updatedTasks));
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom, black, white)',
      }}
    >
      <div className="flex max-w-5xl w-full mx-auto p-4 bg-gray-300 bg-opacity-90 shadow-md rounded-lg flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl text-black font-bold pb-2 border-b-2 border-black">
            Hal Yang Harus Dikerjakan
          </h1>
          <button
            onClick={addTask}
            className="bg-gray-700 text-white px-4 py-2 rounded shadow-md hover:bg-gray-400"
          >
            Tambah Tugas
          </button>
        </div>

        {/* ⬇️ Tambahan info jumlah tugas */}
        <div className="flex justify-between text-sm text-black font-medium mb-2 px-1">
          <p>Selesai: {completedCount}</p>
          <p>Belum Selesai: {uncompletedCount}</p>
        </div>

        <div className="flex-1 overflow-y-auto border border-black rounded-lg p-2 bg-white">
          <ul>
            <AnimatePresence>
              {tasks.map((task) => {
                const timeLeft = calculateTimeRemaining(task.deadline);
                const isExpired = timeLeft === 'Waktu habis!';

                const taskClasses = isExpired
                  ? 'bg-black text-white'
                  : 'bg-slate-500 text-white';

                return (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col justify-between p-2 border-b rounded-lg mb-2 ${taskClasses}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span
                        className={`transition-500 ${task.completed || isExpired
                          ? 'line-through'
                          : 'font-semibold'
                        }`}
                      >
                        {task.text}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editTask(task)}
                          className="text-white p-1 rounded hover:bg-gray-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-white p-1 rounded hover:bg-gray-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="text-sm">
                      Deadline: {new Date(task.deadline).toLocaleString()}
                    </p>
                    <p className="text-xs font-semibold">
                      ⏳ {timeRemaining[task.id] || 'Menghitung...'}
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {popupMessage && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 text-white p-4 rounded-lg shadow-md ${
              popupMessage.includes('dihapus') ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ zIndex: 999 }}
          >
            {popupMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
