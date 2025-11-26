// Simple test endpoint to verify routing works
module.exports = async (req, res) => {
  res.status(200).json({ 
    message: 'API routing is working!',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

