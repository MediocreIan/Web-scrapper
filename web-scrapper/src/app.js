require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
fs = require('fs');

const axios = require('axios');
const cheerio = require('cheerio');

const getCourseData = async () =>
{
  console.log("\x1b[31m", 'begining web scrape of myeducationpath.com', "\x1b[37m")
  try
  {
    let allCourses = []
    for (let i = 1; i < 1000; i++)
    {
      const { data } = await axios.get(
        `http://myeducationpath.com/courses/?start=${i * 20}&limit=20`
      );
      const $ = cheerio.load(data);
      const pageCourses = [];
      courseTitleNode = 'div.thumbnail'
      $(courseTitleNode).each((_idx, el) =>
      {
        let courseName = $(el).find('div.course-title').find('h3').find('a').text().replace(/(\r\n)+|\r+|\n+|\t+/g, '').trim()

        let tagBox = $(el).find('div.row').find('div.course-details').find('div.course-tags').children('span.label')
        let tags = []
        $(tagBox).each((_idx, el) =>
        {
          if ($(el).text())
          {
            tags.push($(el).text())
          }
        })
        let price = "free"
        // price is free by default. If a price is found in the following loop it will be set to that price instead.
        for (let i = 0; i < tags.length; i++)
        {
          const element = tags[i];
          if (element.substring(0, 1) === '$')
          {
            price = element
          }

        }
        let description = $(el).find('div.row').find('div.course-description').find('p').text()
        // this is the font tag containing other font with the description in them 

        // above finds each of the tag texts. these are within the same parent as the provider so keep an eye out for issues there in case some tags are links. might be issues there.
        //no issue found.
        let provider = $(el).find('div.row').find('div.course-details').find('div.course-tags').children('a').text().replace(/(\r\n)+|\r+|\n+|\t+/g, '')
        pageCourses.push({ courseName, provider, tags, description, price })

      });

      fs.appendFileSync('output.json', JSON.stringify(pageCourses), function (err)
      {
        if (err) return console.log(err);
      })
      console.log(`page ${i} written to output.json`);
      if (pageCourses.length < 20)
      {
        console.log("\x1b[36m", 'final page reached')
        break
      }
      // there will always be 20 results except on the last page so if theres ever less than 20 the loop should break
      console.log(`page ${i} has been scrapped`)
    }

    return JSON.stringify(allCourses[0])
  } catch (error)
  {
    throw error;
  }
};

getCourseData()
  .then((courseNames) => console.log('complete'))


const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.get("/", (req, res) =>
{
  getCourseData()
    .then((courseNames) => res.send(courseNames));
});

app.use(function errorHandler(error, req, res, next)
{
  let response;
  if (NODE_ENV === "production")
  {
    response = { error: { message: "server error" } };
  } else
  {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
