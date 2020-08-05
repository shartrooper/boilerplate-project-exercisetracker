const exerciseTrackerRouter = require("express").Router();
const User = require("../model/users");
const Exercise = require("../model/exercises");

exerciseTrackerRouter.post(
  "/new-user",
  async (req, res, next) => {
    const { body } = req;
    try {
      const user = new User({
        username: body.username
      });

      const savedUser = await user.save();
      req.userdata = savedUser;
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  (req, res) => {
    const { username, _id } = req.userdata;
    res.json({
      username,
      _id
    });
  }
);

exerciseTrackerRouter.get(
  "/users",
  async (req, res, next) => {
    try {
      let userList = await User.find({});
      req.list = userList.map(user => {
        const { username, _id } = user;

        return {
          username,
          _id
        };
      });
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  (req, res) => {
    res.json(req.list);
  }
);

exerciseTrackerRouter.post(
  "/add",
  async (req, res, next) => {
    const { body } = req;
    try {
      const foundUser = await User.findById(body.userId);
      const exercise = new Exercise({
        description: body.description,
        duration: body.duration,
        date: body.date ? body.date : new Date(),
        user: foundUser._id
      });

      const savedExercise = await exercise.save();

      foundUser.exercises = foundUser.exercises.concat(savedExercise);
      await foundUser.save();
      req.profile = {
        _id: foundUser._id,
        username: foundUser.username,
        date: savedExercise.date.toDateString(),
        duration: savedExercise.duration,
        description: savedExercise.description
      };
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  (req, res) => {
    res.json(req.profile);
  }
);

exerciseTrackerRouter.get(
  "/log",
  async (req, res, next) => {
    let { userId, from, to, limit } = req.query,
      count = 0;

    limit = limit ? parseInt(limit) : false;

    const filteredLog = log => {
      let fromDate =
          from && new Date(from) != "Invalid Date" ? new Date(from) : false,
        toDate = to && new Date(to) != "Invalid Date" ? new Date(to) : false;

      if (fromDate || toDate) {
        let newLog = [];
        for (let exercise of log) {
          if (count === limit) {
            break;
          }
          if (
            (!fromDate ? true : new Date(exercise.date) >= fromDate) &&
            (!toDate ? true : new Date(exercise.date) <= toDate)
          ) {
            exercise.date = exercise.date.toDateString();
            newLog.push(exercise);
            count++;
          }
        }
        newLog = newLog.sort(function(a, b) {
          var c = new Date(a.date);
          var d = new Date(b.date);
          return d - c;
        });
        if (fromDate && !toDate) {
          return { from: fromDate.toDateString(), count: count, log: newLog };
        } else if (!fromDate && toDate) {
          return { to: toDate.toDateString(), count: count, log: newLog };
        }
        return {
          from: fromDate.toDateString(),
          to: toDate.toDateString(),
          count: count,
          log: newLog
        };
      } else {
        let newLog = [];
        for (let exercise of log) {
          if (count === limit) {
            break;
          }

          exercise.date = exercise.date.toDateString();
          newLog.push(exercise);
          count++;
        }

        return { count: count, log: newLog };
      }
    };

    try {
      const foundUser = await User.findById(userId);
      const exerciseLog = await Promise.all(
        foundUser.exercises.map(async id => {
          const foundExercise = await Exercise.findById(id);
          const { description, duration, date } = foundExercise;
          return {
            description,
            duration,
            date
          };
        })
      );
      const myfilteredLog = filteredLog(exerciseLog);
      req.log = {
        _id: foundUser._id,
        username: foundUser.username,
        ...myfilteredLog
      };
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
  (req, res) => {
    res.json(req.log);
  }
);

module.exports = exerciseTrackerRouter;
