const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/LOGI')
    .then(async () => {
        console.log('Connected to MongoDB');
        
        try {
            // Drop the old username index if it exists
            try {
                await mongoose.connection.db.collection('users').dropIndex('username_1');
                console.log('Successfully dropped username_1 index');
            } catch (error) {
                if (error.code === 27) {
                    console.log('Index username_1 does not exist (already dropped)');
                } else {
                    throw error;
                }
            }
            
            // Drop the unique email index
            try {
                await mongoose.connection.db.collection('users').dropIndex('email_1');
                console.log('Successfully dropped email_1 unique index');
            } catch (error) {
                if (error.code === 27) {
                    console.log('Index email_1 does not exist');
                } else {
                    throw error;
                }
            }
            
            // Drop and recreate rgno index as unique
            try {
                await mongoose.connection.db.collection('users').dropIndex('rgno_1');
                console.log('Dropped old rgno_1 index');
            } catch (error) {
                if (error.code === 27) {
                    console.log('Index rgno_1 does not exist');
                } else {
                    throw error;
                }
            }
            
            // Ensure rgno has a unique index
            await mongoose.connection.db.collection('users').createIndex(
                { rgno: 1 }, 
                { unique: true, background: true }
            );
            console.log('Created unique index on rgno');
            
        } catch (error) {
            console.error('Error:', error.message);
        }
        
        // List current indexes
        const indexes = await mongoose.connection.db.collection('users').indexes();
        console.log('Current indexes:', JSON.stringify(indexes, null, 2));
        
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
