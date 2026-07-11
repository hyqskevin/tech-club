const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
      <p className="text-muted-foreground mb-8">页面不存在</p>
      <button
        onClick={() => window.location.href = '/'}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        返回首页
      </button>
    </div>
  );
};

export default NotFound;
