import mongoose from 'mongoose';

export async function connectDb(uri: string): Promise<void> {
  // Повторяем подключение: при старте в Docker/Kubernetes база может подняться позже сервиса
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(`MongoDB подключена: ${uri.replace(/\/\/.*@/, '//***@')}`);
      return;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.log(`MongoDB недоступна, попытка ${attempt}/10, ждём 3 с`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
