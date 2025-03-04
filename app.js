const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./pool');

//Server
module.exports = () => {
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', (req, res) => {
        console.log('working db')
    })

    //USER ROUTES
    app.post('/users/add-user', async (req, res) => {
        try {
            const { username, profile_name, email, password, profile_picture } = req.body;

            if (!username || !profile_name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }

            const checkQuery = `SELECT * FROM users WHERE email = $1`;
            const { rows: existingRows } = await pool.query(checkQuery, [email]);
            if (existingRows.length > 0) {
                return res.status(400).json({ success: false, message: "User already exists" });
            }

            const insertQuery = `
            INSERT INTO users (username, profile_name, email, password, profile_picture)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
            const { rows } = await pool.query(insertQuery, [username, profile_name, email, password, profile_picture]);

            return res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error saving user:", error);
            return res.status(500).json({ success: false, message: 'Error saving user' });
        }
    });

    app.get('/users/get-user-info', async (req, res) => {
        try {
            const { userId } = req.body;

            const query = "SELECT * FROM users WHERE user_id = $1";
            const { rows } = await pool.query(query, [userId]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error fetching user:", error);
            return res.status(500).json({ success: false, message: 'Error fetching user' });
        }
    });

    app.put('/users/update-user', async (req, res) => {
        try {
            const { userId, username, profile_name, email, password, profile_picture } = req.body;

            if (!username || !profile_name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }

            const checkQuery = `SELECT * FROM users WHERE user_id=$1`;
            const { rows: existingRows } = await pool.query(checkQuery, [userId]);

            if (existingRows.length === 0) {
                return res.status(404).json({ success: false, message: "User does not exist" });
            }

            const updateQuery = `
            UPDATE users 
            SET username=$1, profile_name=$2, email=$3, password=$4, profile_picture=$5 
            WHERE user_id=$6 
            RETURNING *;
        `;
            const { rows } = await pool.query(updateQuery, [username, profile_name, email, password, profile_picture, userId]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error updating user:", error);
            return res.status(500).json({ success: false, message: 'Error updating user' });
        }
    });

    app.delete('/users/delete-user', async (req, res) => {
        try {
            const { userId } = req.body;

            const deleteQuery = `DELETE FROM users WHERE user_id = $1 RETURNING *;`;
            const { rows } = await pool.query(deleteQuery, [userId]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error deleting user:", error);
            return res.status(500).json({ success: false, message: "Error deleting user" });
        }
    });

    

    //FOLLOWER ROUTES
    app.get('/user/get-followers', async (req, res) => {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ success: false, message: 'User ID is required' });
            }

            const query = "SELECT u.* FROM users u INNER JOIN followers f ON u.user_id = f.follower_id WHERE f.following_id = $1";
            const { rows } = await pool.query(query, [userId]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error fetching followers:", error);
            return res.status(500).json({ success: false, message: 'Error fetching followers' });
        }
    });

    app.post('/user/add-follower', async (req, res) => {
        try {
            const { userId, followerId } = req.body;

            if (!userId || !followerId) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }

            const findUserQuery = "SELECT * FROM users WHERE user_id = $1";
            const { rows: ExistingUser } = await pool.query(findUserQuery, [followerId]);

            if(ExistingUser.length === 0){
                return res.status(404).json({success: false, message: 'User does not exist'})
            }

            const query = "INSERT INTO followers (follower_id, following_id) VALUES ($1, $2) RETURNING *";
            const { rows } = await pool.query(query, [followerId, userId]);

            return res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding follower:", error);
            return res.status(500).json({ success: false, message: 'Error adding follower' });
        }
    });



    //POST ROUTES
    app.post('/user/add-post', async (req, res) => {
        try {
            let { userId, caption, image_url } = req.body;

            if (!userId || !image_url) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }

            const insertQuery = `
            INSERT INTO posts (user_id, caption, image_url)
            VALUES ($1, $2, $3) RETURNING *;
        `;
            const { rows } = await pool.query(insertQuery, [userId, caption, image_url]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding post:", error);
            res.status(500).json({ success: false, message: 'Error adding post' });
        }
    })

    app.get('/user/get-posts', async (req, res) => {
        try {
            const { userId } = req.body;

            const query = "SELECT * FROM posts WHERE user_id = $1";
            const { rows } = await pool.query(query, [userId]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error fetching posts:", error);
            return res.status(500).json({ success: false, message: 'Error fetching posts' });
        }
    });

    app.put('/user/update-post', async (req, res) => {
        try {
            const { userId, postId, caption, image_url } = req.body;

            if (!userId || !postId || !caption || !image_url) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }

            const updateQuery = `
                UPDATE posts 
                SET caption=$1, image_url=$2
                WHERE user_id=$3 AND post_id=$4 
                RETURNING *
            `;
            const { rows } = await pool.query(updateQuery, [caption, image_url, userId, postId]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error updating post:", error);
            return res.status(500).json({ success: false, message: 'Error updating post' });
        }
    });

    app.delete('/user/delete-post', async (req, res) => {
        try {
            const { userId, postId } = req.body;

            if (!userId || !postId) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }

            const deleteQuery = `DELETE FROM posts WHERE user_id = $1 and post_id = $2 RETURNING *;`;
            const { rows } = await pool.query(deleteQuery, [userId, postId]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error deleting post:", error);
            return res.status(500).json({ success: false, message: "Error deleting post" });
        }
    });



    //POST-LIKE ROUTES
    app.post('/user/post/add-like', async (req, res) => {
        try {
            let { userId, postId } = req.body;

            if (!userId || !postId) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }

            const insertQuery = `
            INSERT INTO post_likes (user_id, post_id)
            VALUES ($1, $2) RETURNING *;
        `;
            const { rows } = await pool.query(insertQuery, [userId, postId]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding like:", error);
            res.status(500).json({ success: false, message: 'Error adding like' });
        }
    })

    app.get('/user/post/get-likes', async (req, res) => {
        try {
            let { userId, postId } = req.body;

            if (!userId || !postId) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }
            const query = `
                    SELECT COUNT(like_id) from post_likes where user_id = $1 AND post_id = $2;
                `;
            const { rows } = await pool.query(query, [userId, postId]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error getting likes count:", error);
            res.status(500).json({ success: false, message: 'Error getting post likes' });
        }
    })



    //POST-COMMENT ROUTES
    app.post('/user/post/add-comment', async (req, res) => {
        try {
            let { userId, postId, content } = req.body;

            if (!userId || !postId) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }
            const insertQuery = `
                    INSERT INTO post_comments (user_id, post_id, content)
                    VALUES ($1, $2, $3) RETURNING *;
                `;
            const { rows } = await pool.query(insertQuery, [userId, postId, content]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding comment:", error);
            res.status(500).json({ success: false, message: 'Error adding comment' });
        }
    })

    app.get('/user/post/get-comments', async (req, res) => {
        try {
            let { userId, postId } = req.body;

            if (!userId || !postId) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }

            const query = `
                    SELECT * from post_comments where user_id = $1 AND post_id = $2;
                `;
            const { rows } = await pool.query(query, [userId, postId]);
            res.status(201).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error getting comments count:", error);
            res.status(500).json({ success: false, message: 'Error getting post comments' });
        }
    })

    app.post('/user/post/comment/add-reply', async (req, res) => {
        try {
            let { userId, commentId, content } = req.body;

            if (!userId || !commentId || !content) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }

            const insertQuery = `
            INSERT INTO replies (user_id, comment_id, content)
            VALUES ($1, $2, $3) RETURNING *;
        `;
            const { rows } = await pool.query(insertQuery, [userId, commentId, content]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding reply:", error);
            res.status(500).json({ success: false, message: 'Error adding reply' });
        }
    })



    //STORY ROUTES
    app.post('/user/add-story', async (req, res) => {
        try {
            let { userId, image_url, content } = req.body;

            if (!userId || !image_url) {
                return res.status(400).json({
                    success: false,
                    message: "Incomplete Data Recieved",
                });
            }

            const insertQuery = `
            INSERT INTO stories (user_id, image_url, content)
            VALUES ($1, $2, $3) RETURNING *;
        `;
            const { rows } = await pool.query(insertQuery, [userId, image_url, content]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error adding story:", error);
            res.status(500).json({ success: false, message: 'Error adding story' });
        }
    })

    app.get('/user/get-stories', async (req, res) => {
        try {
            const { userId } = req.body;

            const query = "SELECT * FROM stories WHERE user_id = $1";
            const { rows } = await pool.query(query, [userId]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error fetching stories:", error);
            return res.status(500).json({ success: false, message: 'Error fetching stories' });
        }
    });

    app.put('/user/update-story', async (req, res) => {
        try {
            const { userId, storyId, image_url, content } = req.body;

            if (!userId || !storyId || !image_url) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }
            const updateQuery = `
                UPDATE stories
                SET image_url=$1, content=$2
                WHERE user_id=$3 AND story_id=$4 
                RETURNING *;
            `;
            const { rows } = await pool.query(updateQuery, [image_url, content, userId, storyId]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error updating story:", error);
            return res.status(500).json({ success: false, message: 'Error updating story' });
        }
    });

    app.delete('/user/delete-story', async (req, res) => {
        try {
            const { userId, storyId } = req.body;

            if (!userId || !storyId) {
                return res.status(400).json({ success: false, message: 'Incomplete Data Received' });
            }
            const deleteQuery = `DELETE FROM stories WHERE user_id = $1 and story_id = $2 RETURNING *;`;
            const { rows } = await pool.query(deleteQuery, [userId, storyId]);

            return res.status(200).json({ success: true, data: rows[0] });

        } catch (error) {
            console.error("Error deleting story:", error);
            return res.status(500).json({ success: false, message: "Error deleting story" });
        }
    });



    //GROUP-ROUTES
    app.post('/user/create-group', async (req, res) => {
        try {
            const { userId, groupName } = req.body;

            const query = "INSERT INTO chat_group (group_name, created_by) VALUES ($1, $2) RETURNING *";
            const { rows } = await pool.query(query, [groupName, userId]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error creating group:", error);
            return res.status(500).json({ success: false, message: 'Error creating group' });
        }
    });

    app.get('/user/get-group-info', async (req, res) => {
        try {
            const { groupId } = req.body;

            const query = "SELECT * FROM chat_group WHERE group_id = $1";
            const { rows } = await pool.query(query, [groupId]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error fetching group details:", error);
            return res.status(500).json({ success: false, message: 'Error fetching group details' });
        }
    });

    app.post('/user/group/send-message', async (req, res) => {
        try {
            const { groupId, userId, content } = req.body;

            const query = "INSERT INTO group_messages (group_id, sent_by, content) VALUES ($1, $2, $3) RETURNING *";
            const { rows } = await pool.query(query, [groupId, userId, content]);

            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error("Error sending message:", error);
            return res.status(500).json({ success: false, message: 'Error sending message' });
        }
    });

    app.get('/user/group/get-messages', async (req, res) => {
        try {
            const { groupId } = req.body;

            const query = "SELECT message_id, sent_by, content FROM group_messages WHERE group_id = $1";
            const { rows } = await pool.query(query, [groupId]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error fetching group details:", error);
            return res.status(500).json({ success: false, message: 'Error fetching group details' });
        }
    });



    //CHAT ROUTES
    app.post('/user/send-chat-message', async (req, res) => {
        try {
            const { senderId, recieverId, content } = req.body;

            const query = "INSERT INTO chats (sender_id, reciever_id, message_content) VALUES ($1, $2, $3) RETURNING *";
            const { rows } = await pool.query(query, [senderId, recieverId, content]);

            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error sending chat:", error);
            return res.status(500).json({ success: false, message: 'Error sending chat' });
        }
    });  

    app.get('/user/get-chats', async (req, res) => {
        try {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const { userId } = req.body;
    
            const query = "SELECT chat_id, sender_id, message_content, sent_at FROM chats WHERE reciever_id = $1 OR sender_id = $1";
            const { rows } = await pool.query(query, [userId]);
    
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const results = {};

            if (endIndex < rows.length) {
                results.next = {
                    page: page + 1,
                    limit: limit
                };
            }
    
            if (startIndex > 0) {
                results.previous = {
                    page: page - 1,
                    limit: limit
                };
            }

            results.results = rows.slice(startIndex, endIndex);
    
            return res.status(200).json({ success: true, data: results });
        } catch (error) {
            console.log('Error fetching chats: ', error);
            return res.status(500).json({ success: false, message: 'Error fetching paginated chats' });
        }
    });    

    return app;
};